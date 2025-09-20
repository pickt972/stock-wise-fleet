import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  ChevronLeft,
  ShoppingCart,
  Building2,
  Tag,
  Car,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Articles", href: "/articles", icon: Package },
  { name: "Révisions", href: "/revisions", icon: Wrench },
  { name: "Commandes", href: "/commandes", icon: ShoppingCart },
  { name: "Entrées", href: "/entrees", icon: ArrowDownToLine },
  { name: "Sorties", href: "/sorties", icon: ArrowUpFromLine },
  { name: "Inventaire", href: "/inventaire", icon: ClipboardList },
];

const adminNavigation = [
  { name: "Administration", href: "/administration", icon: Settings },
  { name: "Utilisateurs", href: "/users", icon: Users },
  { name: "Fournisseurs", href: "/fournisseurs", icon: Building2 },
  { name: "Catégories", href: "/categories", icon: Tag },
  { name: "Véhicules", href: "/vehicules", icon: Car },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { userRole } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-16 left-0 h-[calc(100vh-4rem)] bg-card border-r border-border shadow-medium z-50 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "max-w-[75vw] sm:max-w-[60vw] md:max-w-none"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-end p-4">
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

          <nav className="flex-1 px-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => window.innerWidth < 768 && onClose()}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-soft" 
                      : "text-muted-foreground",
                    isCollapsed && "justify-center"
                  )
                }
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
            
            {/* Navigation admin - Section séparée */}
            {userRole === 'admin' && (
              <div className="pt-4">
                {!isCollapsed && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Administration
                    </h3>
                  </div>
                )}
                <div className="space-y-1">
                  {adminNavigation.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => window.innerWidth < 768 && onClose()}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-soft" 
                            : "text-muted-foreground",
                          isCollapsed && "justify-center"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}