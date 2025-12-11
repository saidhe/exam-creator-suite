import { useEffect, useState } from 'react';
import { Search, Shield, GraduationCap, User } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (profiles && roles) {
      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.id)?.role || 'etudiant',
      }));
      setUsers(usersWithRoles);
    }
    
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    const { error } = await supabase.from('user_roles').insert([{
      user_id: userId,
      role: newRole as 'admin' | 'professeur' | 'etudiant',
    }]);

    if (error) {
      toast.error('Erreur lors de la mise à jour du rôle');
    } else {
      toast.success('Rôle mis à jour');
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive/20 text-destructive border-0">Admin</Badge>;
      case 'professeur':
        return <Badge className="bg-primary/20 text-primary border-0">Professeur</Badge>;
      default:
        return <Badge className="bg-success/20 text-success border-0">Étudiant</Badge>;
    }
  };

  return (
    <AppLayout title="Gestion des Utilisateurs">
      <div className="space-y-6 animate-fade-in">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Chargement...</div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-secondary">
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {user.full_name || 'Sans nom'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {getRoleBadge(user.role)}
                  <Select
                    value={user.role}
                    onValueChange={(value) => updateUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="etudiant">Étudiant</SelectItem>
                      <SelectItem value="professeur">Professeur</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminUsers;
