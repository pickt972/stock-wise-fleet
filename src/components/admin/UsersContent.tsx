import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserCog, Trash2, UserCheck, UserX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EditUserDialog from "@/components/users/EditUserDialog";
import CreateUserDialog from "@/components/users/CreateUserDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string | null;
  role: string;
  created_at: string;
  is_active: boolean;
  email: string;
}

export function UsersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_email');
      if (error) throw error;

      const usersWithRoles: User[] = (data || []).map((u: any) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        email: u.email,
        is_active: u.is_active,
        role: u.role || 'magasinier',
        created_at: '',
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);


  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: userToDelete.id }
      });

      if (error) {
        const detailed = (data as any)?.error || (data as any)?.hint || error.message;
        throw new Error(detailed || "Erreur inconnue");
      }
      if (data && (data as any).error) {
        throw new Error((data as any).hint || (data as any).error);
      }

      toast.success(`${userToDelete.first_name} ${userToDelete.last_name} a été supprimé`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Erreur suppression utilisateur:', error);
      toast.error(error.message || "Impossible de supprimer l'utilisateur. Essayez de le désactiver à la place.");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(
        !user.is_active
          ? `${user.first_name} ${user.last_name} a été activé`
          : `${user.first_name} ${user.last_name} a été désactivé`
      );
      await fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Impossible de modifier le statut");
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'chef_agence': return "Chef d'agence";
      case 'magasinier': return 'Magasinier';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div>Chargement des utilisateurs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des utilisateurs</CardTitle>
        <CardDescription>Gérez les utilisateurs et leurs rôles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>

        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium">{user.first_name} {user.last_name}</h3>
                  <p className="text-sm text-muted-foreground">{user.username || 'Aucun nom d\'utilisateur'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{getRoleDisplay(user.role)}</Badge>
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                      {user.is_active ? "Actif" : "Désactivé"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.id !== user.id && (
                  <div className="flex items-center gap-1 mr-1" title={user.is_active ? "Désactiver" : "Activer"}>
                    {user.is_active ? <UserCheck className="h-4 w-4 text-muted-foreground" /> : <UserX className="h-4 w-4 text-muted-foreground" />}
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => handleToggleActive(user)}
                    />
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                  <UserCog className="h-4 w-4" />
                </Button>
                {currentUser?.id !== user.id && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUserToDelete(user)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

      </CardContent>

      <EditUserDialog
        user={selectedUser}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUserUpdated={fetchUsers}
      />

      <CreateUserDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onUserCreated={fetchUsers}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.first_name} {userToDelete?.last_name}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}