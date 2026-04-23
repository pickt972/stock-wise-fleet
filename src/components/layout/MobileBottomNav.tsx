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

  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-medium",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      aria-label="Navigation principale mobile"
    >
      <div className="grid grid-cols-5 items-end h-16 relative">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors",
            "active:scale-95",
            isActive("/dashboard")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Accueil</span>
        </NavLink>

        {/* Articles */}
        <NavLink
          to="/articles"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors",
            "active:scale-95",
            isActive("/articles")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-5 w-5" />
          <span>Articles</span>
        </NavLink>

        {/* Bouton scan central proéminent — ouvre directement la caméra */}
        <div className="flex items-center justify-center h-full">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            aria-label="Scanner un code-barres"
            className={cn(
              "relative -mt-6 h-16 w-16 rounded-full bg-primary text-primary-foreground",
              "shadow-lg flex items-center justify-center",
              "active:scale-95 transition-transform",
              "ring-4 ring-background"
            )}
          >
            <ScanLine className="h-7 w-7" />
          </button>
        </div>

        {/* Alertes */}
        <NavLink
          to="/alertes"
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors",
            "active:scale-95",
            isActive("/alertes")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bell className="h-5 w-5" />
          {totalAlerts > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-1 right-3 h-4 min-w-4 px-1 flex items-center justify-center p-0 text-[10px]"
            >
              {totalAlerts > 99 ? "99+" : totalAlerts}
            </Badge>
          )}
          <span>Alertes</span>
        </NavLink>

        {/* Plus */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition-colors",
                "active:scale-95 text-muted-foreground hover:text-foreground"
              )}
              aria-label="Plus d'options"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Toutes les sections</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-4 grid grid-cols-3 gap-3 pb-8">
              {moreItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleMoreClick(item.href)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border",
                    "bg-card hover:bg-accent active:scale-95 transition-all min-h-[88px]",
                    isActive(item.href) && "bg-primary/10 border-primary text-primary"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <BarcodeScanner
        isOpen={showScanner}
        onScanResult={handleScanResult}
        onClose={() => setShowScanner(false)}
      />
    </nav>
  );
}
