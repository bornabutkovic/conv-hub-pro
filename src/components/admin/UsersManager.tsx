import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoleDisplayName } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, KeyRound } from 'lucide-react';

export function UsersManager() {
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: institutions } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const updateUserInstitution = useMutation({
    mutationFn: async ({ userId, institutionUuid }: { userId: string; institutionUuid: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ institution_uuid: institutionUuid })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  const sendPasswordReset = async (email: string | null) => {
    if (!email) {
      toast.error('Korisnik nema email adresu');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://conwayo.app/auth/reset-password',
    });
    if (error) {
      toast.error(error.message || 'Greška pri slanju emaila');
      return;
    }
    toast.success('Email za reset lozinke je poslan.');
  };

  const getInstitutionName = (institutionUuid: string | null) => {
    if (!institutionUuid || !institutions) return 'Not assigned';
    const institution = institutions.find((i) => i.id === institutionUuid);
    return institution?.name || 'Unknown';
  };

  if (usersLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!users?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No users found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={(user.role === 'super_admin' || user.role === 'admin') ? 'default' : 'secondary'}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[200px]">
                  <Select
                    value={user.institution_uuid || 'none'}
                    onValueChange={(value) => {
                      updateUserInstitution.mutate({
                        userId: user.id,
                        institutionUuid: value === 'none' ? null : value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {getInstitutionName(user.institution_uuid)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not assigned</SelectItem>
                      {institutions?.map((institution) => (
                        <SelectItem key={institution.id} value={institution.id || ''}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendPasswordReset(user.email)}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Pošalji reset lozinke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
