import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface ApproveUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  onApproved: () => void;
}

export function ApproveUserModal({ open, onOpenChange, user, onApproved }: ApproveUserModalProps) {
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: institutions } = useQuery({
    queryKey: ['institutions-list-approve'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleApprove = async () => {
    if (!selectedInstitution) {
      toast.error('Please select an institution');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'event_organizer',
          institution_uuid: selectedInstitution,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`${user.first_name || user.email} approved as Event Organizer`);
      setSelectedInstitution('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['admin-all-users-with-institutions'] });
      onApproved();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error(error.message || 'Failed to approve user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Approve User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">User</p>
            <p className="font-medium">{displayName}</p>
            {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Assign to Institution *</Label>
            <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
              <SelectTrigger>
                <SelectValue placeholder="Select an institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions?.map((inst) => (
                  <SelectItem key={inst.id!} value={inst.id!}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            The user will be assigned the <strong>Event Organizer</strong> role and linked to the selected institution.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isSubmitting || !selectedInstitution}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Approve & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
