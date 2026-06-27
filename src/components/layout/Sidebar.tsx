import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  Settings,
  ChevronLeft,
  ShoppingCart,
  History,
  ScanLine,
  Baby,
  Wrench,
  Shield,
  ShieldCheck,
  FileSearch,
  BookOpen,
  AlertTriangle,
  Layers,
  Tags,
  Building2,
  Truck,
  MapPin,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import logo from "@/assets/logo.png";

type NavItem = { name: string; href: string; icon: any; show: boolean };
type NavSection = { label: string; items: NavItem[] };

const getSections = (permissions: any, userRole: string | null): NavSection[] => [
  {
    label: "Vue d'ensemble",
    items: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, show: true },
      { name: "Scanner", href: "/scanner", icon: ScanLine, show: true },
    ],
  },
  {
    label: "Stock",
    items: [
      { name: "Articles", href: "/articles", icon: Package, show: permissions.manageStock },
      { name: "Accessoires", href: "/accessoires", icon: Baby, show: true },
      { name: "Entrées", href: "/entrees", icon: ArrowDownToLine, show: permissions.manageStock },
      { name: "Sorties", href: "/sorties", icon: ArrowUpFromLine, show: permissions.manageStock },
      { name: "Transferts", href: "/transferts", icon: ArrowLeftRight, show: permissions.manageStock },
      { name: "Révisions", href: "/revisions", icon: Wrench, show: permissions.manageStock },
    ],
  },
  {
    label: "Gestion",
    items: [
      { name: "Commandes", href: "/commandes", icon: ShoppingCart, show: permissions.createOrders },
      { name: "Inventaire", href: "/inventaire", icon: ClipboardList, show: permissions.manageStock },
      { name: "Historique", href: "/historique", icon: History, show: permissions.viewReports },
      { name: "Rapports", href: "/rapports", icon: FileText, show: permissions.viewReports },
    ],
  },
  {
    label: "Alertes & Seuils",
    items: [
      { name: "Alertes", href: "/alertes", icon: AlertTriangle, show: true },
      { name: "Seuils de stock", href: "/seuils-stock", icon: Layers, show: permissions.manageStock },
    ],
  },
  {
    label: "Référentiel",
    items: [
      { name: "Catégories", href: "/categories", icon: Tags, show: permissions.manageCategories },
      { name: "Fournisseurs", href: "/fournisseurs", icon: Building2, show: permissions.manageSuppliers },
      { name: "Véhicules", href: "/vehicules", icon: Truck, show: permissions.manageVehicles },
      { name: "Emplacements", href: "/emplacements", icon: MapPin, show: userRole === "admin" },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Utilisateurs", href: "/users", icon: Users, show: !!permissions.manageUsers },
      { name: "Rôles & Permissions", href: "/roles-permissions", icon: ShieldCheck, show: !!permissions.manageUsers },
      { name: "Journal d'audit", href: "/journal-audit", icon: FileSearch, show: !!permissions.manageUsers },
      { name: "Historique articles", href: "/historique-articles", icon: BookOpen, show: !!permissions.manageUsers },
    ],
  },
  {
    label: "Système",
    items: [
      { name: "Paramètres", href: "/parametres", icon: Settings, show: true },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();
  const { permissions, userRole } = useRoleAccess();
  const sections = getSections(permissions, userRole);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 h-[calc(100vh-3.5rem)] z-50 transition-all duration-300 overflow-hidden",
          "p-2",
          isCollapsed ? "w-[76px]" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "max-w-[85vw] sm:max-w-[70vw] md:max-w-none",
        )}
      >
        <div className="h-full bg-card border border-border/60 shadow-soft rounded-2xl flex flex-col overflow-hidden">
          <div
            className={cn(
              "flex items-center px-3 py-3 border-b border-border/60",
              isCollapsed ? "justify-center" : "justify-between",
            )}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <img src={logo} alt="" className="h-7 w-7 rounded-lg flex-shrink-0" />
                <span className="text-[14px] font-bold tracking-tight truncate">StockAuto</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex h-7 w-7"
              aria-label={isCollapsed ? "Déplier" : "Replier"}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
            {sections.map((section) => {
              const visibleItems = section.items.filter((i) => i.show);
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.label}>
                  {!isCollapsed && (
                    <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                      {section.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={() => window.innerWidth < 768 && onClose()}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 px-3 rounded-xl text-[13.5px] font-medium transition-all min-h-[38px]",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/75 hover:bg-muted hover:text-foreground",
                            isCollapsed && "justify-center px-2",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !isCollapsed && (
                              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                            )}
                            <item.icon
                              className={cn(
                                "h-[17px] w-[17px] flex-shrink-0 transition-transform",
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                              )}
                            />
                            {!isCollapsed && <span className="truncate">{item.name}</span>}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {!isCollapsed && (
            <div className="px-4 py-3 border-t border-border/60">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span>Connecté</span>
                <span className="ml-auto font-medium text-foreground/60">v1.0</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
