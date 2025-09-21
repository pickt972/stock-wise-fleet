import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CompactSortControls } from "@/components/ui/compact-sort-controls";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, UserCog, Edit } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import EditUserDialog from "@/components/users/EditUserDialog";

type UserRole = 'admin' | 'chef_agence' | 'magasinier';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: UserRole;
}

interface UserRoleData {
  role: UserRole;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "magasinier"
  });
  const [currentSort, setCurrentSort] = useState('first_name');
  const [currentDirection, setCurrentDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const { userRole } = useAuth();

  const fetchUsers = async () => {
    try {
      // Récupérer d'abord tous les profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username')
        .order('first_name');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Récupérer tous les rôles en une seule requête
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profiles.map(p => p.id));

      if (rolesError) throw rolesError;

      // Mapper les profils avec leurs rôles
      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as UserRole) || 'magasinier'
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const sortOptions = [
    { value: 'first_name', label: 'Prénom' },
    { value: 'last_name', label: 'Nom' },
    { value: 'username', label: "Nom d'utilisateur" },
    { value: 'role', label: 'Rôle' }
  ];

  const applySorting = (data: UserProfile[]) => {
    return [...data].sort((a, b) => {
      let aValue = a[currentSort as keyof UserProfile];
      let bValue = b[currentSort as keyof UserProfile];

      // Gestion spéciale pour le rôle
      if (currentSort === 'role') {
        const roleOrder = { 'admin': '3', 'chef_agence': '2', 'magasinier': '1' };
        aValue = roleOrder[a.role] || '0';
        bValue = roleOrder[b.role] || '0';
      }

      if (aValue === bValue) return 0;
      const result = aValue < bValue ? -1 : 1;
      return currentDirection === 'asc' ? result : -result;
    });
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setCurrentSort(field);
    setCurrentDirection(direction);
  };

  const sortedUsers = applySorting(users);

  // Vérifier que l'utilisateur est admin
  if (userRole !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Accès restreint aux administrateurs
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }


  const createUser = async () => {
    if (!formData.username || !formData.firstName || !formData.lastName || !formData.password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Créer l'utilisateur dans auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: `${formData.username}@stock-wise.local`,
        password: formData.password,
        user_metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
        email_confirm: true,
      });

      if (authError) throw authError;

      // Mettre à jour le profil avec le nom d'utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: formData.username })
        .eq('id', authUser.user.id);

      if (profileError) throw profileError;

      // Assigner le rôle
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: formData.role as UserRole })
        .eq('user_id', authUser.user.id);

      if (roleError) throw roleError;

      toast({
        title: "Utilisateur créé",
        description: `${formData.firstName} ${formData.lastName} a été ajouté avec succès`,
      });

      setFormData({
        username: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "magasinier"
      });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Rôle modifié",
        description: "Le rôle de l'utilisateur a été mis à jour",
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le rôle",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'chef_agence': return 'default';
      case 'magasinier': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-auto">
        
        <div className="flex items-center justify-between">
          <CompactSortControls
            sortOptions={sortOptions}
            currentSort={currentSort}
            currentDirection={currentDirection}
            onSortChange={handleSortChange}
            showDragHandle={false}
          />
        </div>
        
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gestion des utilisateurs</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gérez les comptes utilisateurs et leurs rôles
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau membre à l'équipe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="nom_utilisateur"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      placeholder="Nom"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Mot de passe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({...formData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="magasinier">Magasinier</SelectItem>
                      <SelectItem value="chef_agence">Chef d'agence</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isCreating}
                >
                  Annuler
                </Button>
                <Button onClick={createUser} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
            <CardDescription>
              {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-32">Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Nom d'utilisateur</TableHead>
                  <TableHead className="min-w-24">Rôle</TableHead>
                  <TableHead className="text-right min-w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
               <TableBody>
                  {sortedUsers.map((user) => (
                    <TableRow key={user.id}>
                     <TableCell className="font-medium text-sm">
                       <div>
                         <div>{user.first_name} {user.last_name}</div>
                         <div className="text-xs text-muted-foreground sm:hidden">{user.username}</div>
                       </div>
                     </TableCell>
                     <TableCell className="hidden sm:table-cell text-sm">{user.username}</TableCell>
                     <TableCell>
                       <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                         {user.role === 'admin' ? 'Admin' :
                          user.role === 'chef_agence' ? 'Chef' : 'Mag.'}
                       </Badge>
                     </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 md:gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value as UserRole)}
                          >
                            <SelectTrigger className="w-24 md:w-36 text-xs md:text-sm">
                              <UserCog className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="magasinier">Magasinier</SelectItem>
                              <SelectItem value="chef_agence">Chef d'agence</SelectItem>
                              <SelectItem value="admin">Administrateur</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="h-8 w-8 p-0">
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Êtes-vous sûr de vouloir supprimer {user.first_name} {user.last_name} ?
                                 Cette action est irréversible.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Annuler</AlertDialogCancel>
                               <AlertDialogAction
                                 onClick={() => deleteUser(user.id)}
                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                               >
                                 Supprimer
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <EditUserDialog
          user={selectedUser}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUserUpdated={fetchUsers}
        />
      </div>
    </DashboardLayout>
  );
}