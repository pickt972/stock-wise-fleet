import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardList,
  Settings,
  ChevronLeft,
  ShoppingCart,
  History,
  ScanLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useState } from "react";

const getNavigation = (permissions: any) => [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
  { name: "Scanner", href: "/scanner", icon: ScanLine, show: true },
  { name: "Articles", href: "/articles", icon: Package, show: permissions.manageStock },
  { name: "Entrées", href: "/entrees", icon: ArrowDownToLine, show: permissions.manageStock },
  { name: "Sorties", href: "/sorties", icon: ArrowUpFromLine, show: permissions.manageStock },
  { name: "Commandes", href: "/commandes", icon: ShoppingCart, show: permissions.createOrders },
  { name: "Inventaire", href: "/inventaire", icon: ClipboardList, show: permissions.manageStock },
  { name: "Historique", href: "/historique", icon: History, show: permissions.viewReports },
  { name: "Paramètres", href: "/parametres", icon: Settings, show: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { permissions } = useRoleAccess();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}
      
      <aside className={cn(
        "fixed top-16 left-0 h-[calc(100vh-4rem)] bg-card border-r border-border shadow-medium z-50 transition-all duration-300 overflow-y-auto",
        isCollapsed ? "w-16" : "w-56",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "max-w-[80vw] sm:max-w-[65vw] md:max-w-none"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex"
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )} />
            </Button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5 pb-4">
            {getNavigation(permissions).filter(item => item.show).map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => window.innerWidth < 768 && onClose()}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                    "hover:bg-accent hover:text-accent-foreground active:scale-95",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-soft" 
                      : "text-muted-foreground",
                    isCollapsed && "justify-center px-2"
                  )
                }
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
