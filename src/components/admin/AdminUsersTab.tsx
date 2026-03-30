import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, isAdmin } from '@/lib/roles';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Search,
  Shield,
  Building2,
  UserPlus,
  Crown,
  Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function AdminUsersTab() {
  const { profile: currentUserProfile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const isSuperAdmin = isAdmin(currentUserProfile?.role);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-panel-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, institutions:institution_uuid(id, name)')
        .in('role', ['super_admin', 'admin', 'event_organizer', 'organizer_admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Profile & { institutions: { id: string; name: string } | null })[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-panel-users'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update role'),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User removed from admin roles');
      queryClient.invalidateQueries({ queryKey: ['admin-panel-users'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to remove user'),
  });

  const superAdmins = useMemo(
    () => users?.filter((u) => u.role === 'super_admin') || [],
    [users]
  );

  const adminsOrganizers = useMemo(
    () =>
      users?.filter((u) =>
        ['admin', 'event_organizer', 'organizer_admin'].includes(u.role || '')
      ) || [],
    [users]
  );

  const filterUsers = (list: Profile[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((u) => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const email = u.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  };

  const getCompanyName = (user: Profile & { institutions?: { id: string; name: string } | null }) => {
    if (user.institutions?.name) return user.institutions.name;
    if (user.company_name) return user.company_name;
    if (user.institution) return user.institution;
    return '—';
  };

  const renderUserRow = (user: Profile & { institutions?: { id: string; name: string } | null }) => {
    const isCurrentUser = user.id === currentUserProfile?.id;
    return (
      <TableRow key={user.id}>
        <TableCell className="font-medium">
          {user.first_name || user.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : '—'}
        </TableCell>
        <TableCell className="text-muted-foreground">{getCompanyName(user)}</TableCell>
        <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
        <TableCell>
          <Badge
            variant={
              user.role === 'super_admin' ? 'default' : 'secondary'
            }
          >
            {getRoleDisplayName(user.role)}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {!isCurrentUser && (
              <>
                <Select
                  value={user.role || 'user'}
                  onValueChange={(val) =>
                    updateRole.mutate({ userId: user.id, newRole: val })
                  }
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="event_organizer">Event Organizer</SelectItem>
                  </SelectContent>
                </Select>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will set {user.first_name || user.email}'s role to "User", removing all admin privileges.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeUser.mutate(user.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and invite */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {/* Role filter tabs */}
      <Tabs defaultValue="super_admins">
        <TabsList>
          <TabsTrigger value="super_admins" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Super Admins
            <Badge variant="secondary" className="ml-1">{filterUsers(superAdmins).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="admins_organizers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Admins / Event Organizers
            <Badge variant="secondary" className="ml-1">{filterUsers(adminsOrganizers).length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="super_admins">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Super Admins
              </CardTitle>
              <CardDescription>
                Global platform administrators with full access.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filterUsers(superAdmins).length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No super admins match your search.' : 'No super admins found.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                     <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{filterUsers(superAdmins).map(renderUserRow)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins_organizers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Admins & Event Organizers
              </CardTitle>
              <CardDescription>
                Platform admins and client event organizers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filterUsers(adminsOrganizers).length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No users match your search.' : 'No admins or organizers found.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{filterUsers(adminsOrganizers).map(renderUserRow)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite modal */}
      <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </div>
  );
}
