import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ScanLine, Bell, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAlerts } from "@/hooks/useAlerts";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "@/components/scanner/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  ShoppingCart,
  History,
  Wrench,
  Baby,
  Settings,
  AlertTriangle,
  Users,
  Tags,
  MapPin,
  Truck,
  Building2,
  FileText,
} from "lucide-react";

interface MobileBottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions, userRole } = useRoleAccess();
  const { totalAlerts } = useAlerts();
  const { toast } = useToast();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const moreItems = [
    { name: "Articles", href: "/articles", icon: Package, show: permissions.manageStock },
    { name: "Accessoires", href: "/accessoires", icon: Baby, show: true },
    { name: "Entrées", href: "/entrees", icon: ArrowDownToLine, show: permissions.manageStock },
    { name: "Sorties", href: "/sorties", icon: ArrowUpFromLine, show: permissions.manageStock },
    { name: "Transferts", href: "/transferts", icon: ArrowLeftRight, show: permissions.manageStock },
    { name: "Révisions", href: "/revisions", icon: Wrench, show: permissions.manageStock },
    { name: "Commandes", href: "/commandes", icon: ShoppingCart, show: permissions.createOrders },
    { name: "Inventaire", href: "/inventaire", icon: ClipboardList, show: permissions.manageStock },
    { name: "Historique", href: "/historique", icon: History, show: permissions.viewReports },
    { name: "Rapports", href: "/rapports", icon: FileText, show: permissions.viewReports },
    { name: "Catégories", href: "/categories", icon: Tags, show: permissions.manageStock },
    { name: "Fournisseurs", href: "/fournisseurs", icon: Building2, show: permissions.manageStock },
    { name: "Véhicules", href: "/vehicules", icon: Truck, show: true },
    { name: "Emplacements", href: "/emplacements", icon: MapPin, show: userRole === "admin" },
    { name: "Utilisateurs", href: "/users", icon: Users, show: userRole === "admin" },
    { name: "Alertes", href: "/alertes", icon: AlertTriangle, show: true },
    { name: "Paramètres", href: "/parametres", icon: Settings, show: true },
  ].filter((i) => i.show);

  const handleMoreClick = (href: string) => {
    setMoreOpen(false);
    navigate(href);
  };

  const handleScanResult = async (code: string) => {
    setShowScanner(false);
    const raw = code.trim();
    const numeric = raw.replace(/\D/g, "");
    const q = numeric.length >= 8 ? numeric : raw;

    try {
      const { data } = await supabase
        .from("articles")
        .select("id, designation, reference")
        .or(`reference.eq.${q},code_barre.eq.${q}`)
        .maybeSingle();

      if (data) {
        toast({ title: "✅ Article trouvé", description: data.designation });
        navigate(`/articles/${data.id}`);
        return;
      }

      const { data: partials } = await supabase
        .from("articles")
        .select("id, designation")
        .or(`reference.ilike.%${q}%,code_barre.ilike.%${q}%,designation.ilike.%${q}%`)
        .limit(1);

      if (partials && partials.length > 0) {
        toast({ title: "✅ Article trouvé", description: partials[0].designation });
        navigate(`/articles/${partials[0].id}`);
      } else {
        toast({
          title: "📦 Article introuvable",
          description: `Code : ${q}. Création proposée.`,
        });
        navigate(
          `/articles/new?code_barre=${encodeURIComponent(q)}&returnTo=${encodeURIComponent(location.pathname)}`
        );
      }
    } catch {
      toast({ title: "Erreur de recherche", variant: "destructive" });
    }
  };

  const NavTab = ({
    to,
    icon: Icon,
    label,
    badge,
  }: {
    to: string;
    icon: typeof LayoutDashboard;
    label: string;
    badge?: number;
  }) => (
    <NavLink
      to={to}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-all",
        "active:scale-95",
        isActive(to) ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[22px] w-[22px] transition-transform", isActive(to) && "scale-110")} />
      {badge !== undefined && badge > 0 && (
        <Badge
          variant="destructive"
          className="absolute top-1 right-1/2 translate-x-3 h-4 min-w-4 px-1 flex items-center justify-center p-0 text-[10px]"
        >
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
      <span className="leading-none">{label}</span>
    </NavLink>
  );

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40",
        "px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3",
        "pointer-events-none",
        className,
      )}
      aria-label="Navigation principale mobile"
    >
      {/* Pill flottante glassmorphism */}
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-md",
          "rounded-3xl border border-border/60 shadow-large",
          "bg-card/85 backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <div className="grid grid-cols-5 items-end h-[64px] relative px-1">
          <NavTab to="/dashboard" icon={LayoutDashboard} label="Accueil" />
          <NavTab to="/articles" icon={Package} label="Articles" />

          {/* Bouton scan central — FAB orange premium */}
          <div className="flex items-center justify-center h-full">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              aria-label="Scanner un code-barres"
              className={cn(
                "relative -mt-8 h-[58px] w-[58px] rounded-full text-primary-foreground",
                "bg-gradient-to-br from-primary to-[hsl(20_95%_50%)]",
                "shadow-[0_8px_24px_-4px_hsl(25_95%_53%/0.45)]",
                "flex items-center justify-center",
                "active:scale-90 transition-transform duration-150",
                "ring-[3px] ring-card",
              )}
            >
              <ScanLine className="h-6 w-6" />
            </button>
          </div>

          <NavTab to="/alertes" icon={Bell} label="Alertes" badge={totalAlerts} />

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-all",
                  "active:scale-95 text-muted-foreground hover:text-foreground",
                )}
                aria-label="Plus d'options"
              >
                <MoreHorizontal className="h-[22px] w-[22px]" />
                <span className="leading-none">Plus</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] p-0 rounded-t-3xl">
              <SheetHeader className="px-5 pt-2 pb-3">
                <SheetTitle className="text-[20px] font-bold tracking-tight">Toutes les sections</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-6 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {moreItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleMoreClick(item.href)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl",
                      "bg-muted/50 hover:bg-muted active:scale-95 transition-all min-h-[88px]",
                      isActive(item.href) && "bg-primary/10 ring-1 ring-primary/30",
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center bg-card shadow-soft",
                        isActive(item.href) ? "text-primary" : "text-foreground/80",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight text-foreground">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <BarcodeScanner
        isOpen={showScanner}
        onScanResult={handleScanResult}
        onClose={() => setShowScanner(false)}
      />
    </nav>
  );
}
