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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useState } from "react";

const getNavigation = (permissions: any) => [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
  { name: "Scanner", href: "/scanner", icon: ScanLine, show: true },
  { name: "Accessoires", href: "/accessoires", icon: Baby, show: true },
  { name: "Articles", href: "/articles", icon: Package, show: permissions.manageStock },
  { name: "Entrées", href: "/entrees", icon: ArrowDownToLine, show: permissions.manageStock },
  { name: "Sorties", href: "/sorties", icon: ArrowUpFromLine, show: permissions.manageStock },
  { name: "Transferts", href: "/transferts", icon: ArrowLeftRight, show: permissions.manageStock },
  { name: "Révisions", href: "/revisions", icon: Wrench, show: permissions.manageStock },
  { name: "Commandes", href: "/commandes", icon: ShoppingCart, show: permissions.createOrders },
  { name: "Inventaire", href: "/inventaire", icon: ClipboardList, show: permissions.manageStock },
  { name: "Historique", href: "/historique", icon: History, show: permissions.viewReports },
  { name: "Paramètres", href: "/parametres", icon: Settings, show: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Sidebar style iOS : surface card flottante avec coins arrondis,
 * actif = pill bleu primary, hover discret.
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { permissions } = useRoleAccess();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 h-[calc(100vh-3.5rem)] z-50 transition-all duration-300 overflow-hidden",
          "p-2",
          isCollapsed ? "w-[72px]" : "w-60",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "max-w-[85vw] sm:max-w-[70vw] md:max-w-none",
        )}
      >
        <div className="h-full bg-card border border-border/60 shadow-soft rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-end p-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex"
              aria-label={isCollapsed ? "Déplier" : "Replier"}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5 pb-4 overflow-y-auto">
            {getNavigation(permissions)
              .filter((item) => item.show)
              .map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => window.innerWidth < 768 && onClose()}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 rounded-xl text-[14px] font-medium transition-all min-h-[40px]",
                      "active:scale-[0.97]",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      isCollapsed && "justify-center px-2",
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
