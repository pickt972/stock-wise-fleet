import { Bell, User, Menu, Settings, LogOut, Download, Moon, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { usePWA } from "@/hooks/usePWA";
import { GlobalSearch } from "@/components/GlobalSearch";
import { OfflineSyncStatus } from "@/components/OfflineSyncStatus";
import { useNavigate } from "react-router-dom";
import { useAlerts } from "@/hooks/useAlerts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HeaderProps {
  onMenuClick?: () => void;
}

/**
 * Header style iOS : barre translucide blurrée, hairline border.
 * Sticky en haut, gère le safe-area-inset-top automatiquement.
 */
export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile, userRole, signOut } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const navigate = useNavigate();
  const { subcategoryAlerts, totalAlerts } = useAlerts();
  const { theme, setTheme } = useTheme();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'chef_agence': return "Chef d'agence";
      case 'magasinier': return 'Magasinier';
      default: return 'Utilisateur';
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive' as const;
      case 'chef_agence': return 'secondary' as const;
      case 'magasinier': return 'default' as const;
      default: return 'outline' as const;
    }
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <TooltipProvider>
      <header
        className="sticky top-0 z-30 w-full bg-card/85 backdrop-blur-xl backdrop-saturate-150 border-b border-border/60"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-3 sm:px-5 h-14 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1 max-w-full overflow-hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onMenuClick}
              className="md:hidden flex-shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5 min-w-0 max-w-full overflow-hidden md:hidden">
              <img src={logo} alt="StockAuto" className="h-8 w-8 flex-shrink-0 rounded-lg" />
              <div className="min-w-0 max-w-full overflow-hidden hidden sm:block">
                <h1 className="text-[15px] font-bold text-foreground truncate leading-tight tracking-tight">StockAuto</h1>
              </div>
            </div>

            {/* Recherche globale - Desktop */}
            <div className="hidden lg:block max-w-md flex-1">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <OfflineSyncStatus />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex-shrink-0"
                  aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{theme === "dark" ? "Mode clair" : "Mode sombre"}</p>
              </TooltipContent>
            </Tooltip>

            {isInstallable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="tinted"
                    size="sm"
                    onClick={installApp}
                    className="hidden md:flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden lg:inline">Installer</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Installer l'application</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="relative hidden sm:flex" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {totalAlerts > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center p-0 text-[10px]"
                    >
                      {totalAlerts > 99 ? "99+" : totalAlerts}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 rounded-2xl p-2" align="end">
                <div className="space-y-1">
                  <h4 className="font-semibold text-[15px] px-2 pt-1">Notifications</h4>
                  {subcategoryAlerts.length > 0 ? (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {subcategoryAlerts.slice(0, 5).map((sub) => (
                        <div
                          key={sub.subcategory}
                          className="p-3 rounded-xl text-sm cursor-pointer hover:bg-muted active:bg-muted/80 transition-colors"
                          onClick={() => navigate('/alertes')}
                        >
                          <div className="font-medium text-foreground">{sub.subcategory}</div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">
                            {sub.ruptureCount > 0 ? `${sub.ruptureCount} rupture(s)` : ''}
                            {sub.ruptureCount > 0 && sub.faibleCount > 0 ? ' · ' : ''}
                            {sub.faibleCount > 0 ? `${sub.faibleCount} stock(s) faible(s)` : ''}
                            {' '}sur {sub.totalArticles} articles
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3">Aucune notification</p>
                  )}
                  {subcategoryAlerts.length > 0 && (
                    <Button
                      variant="tinted"
                      size="sm"
                      className="w-full mt-1"
                      onClick={() => navigate('/alertes')}
                    >
                      Voir toutes les alertes
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 rounded-2xl" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-3">
                  <p className="text-[15px] font-semibold leading-tight">
                    {profile ? `${profile.first_name} ${profile.last_name}` : 'Utilisateur'}
                  </p>
                  <p className="text-[12px] leading-tight text-muted-foreground truncate">
                    {user?.email}
                  </p>
                  {userRole && (
                    <Badge variant={getRoleVariant(userRole)} className="text-[10px] w-fit mt-1">
                      {getRoleLabel(userRole)}
                    </Badge>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-lg mx-1">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/parametres')} className="rounded-lg mx-1">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive rounded-lg mx-1 focus:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
