import { Bell, User, Menu, Settings, LogOut } from "lucide-react";
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

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile, userRole, signOut } = useAuth();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'chef_agence': return 'Chef d\'agence';
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
    <header className="bg-card border-b border-border shadow-soft w-full">
      <div className="flex items-center justify-between px-2 sm:px-4 h-16 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 min-w-0 flex-1 max-w-full overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="md:hidden flex-shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 max-w-full overflow-hidden">
            <img src={logo} alt="StockAuto Logo" className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 flex-shrink-0" />
            <div className="min-w-0 max-w-full overflow-hidden">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">StockAuto</h1>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">Gestion des stocks</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="relative hidden sm:flex">
            <Bell className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
          </Button>
          
          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {profile ? `${profile.first_name} ${profile.last_name}` : 'Utilisateur'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                {userRole && (
                  <Badge variant={getRoleVariant(userRole)} className="text-xs w-fit">
                    {getRoleLabel(userRole)}
                  </Badge>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Paramètres</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
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
  );
}