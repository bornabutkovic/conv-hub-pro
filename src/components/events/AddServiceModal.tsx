import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AddServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  currency: string;
  editService?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    capacity: number | null;
  } | null;
  eventStatus?: string | null;
}

export function AddServiceModal({ open, onOpenChange, eventId, currency, editService, eventStatus }: AddServiceModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);
  const [formData, setFormData] = useState({
    name: editService?.name || '',
    description: editService?.description || '',
    price: editService?.price?.toString() || '',
    capacity: editService?.capacity?.toString() || '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const serviceData = {
        event_id: eventId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        currency: currency,
      };

      if (editService) {
        const { error } = await supabase
          .from('event_services')
          .update(serviceData)
          .eq('id', editService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_services')
          .insert(serviceData);
        if (error) throw error;

        // If adding to an active event, revert to pending_approval
        if (eventStatus === 'active') {
          await supabase
            .from('events')
            .update({ status: 'pending_approval' })
            .eq('id', eventId);

          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
          queryClient.invalidateQueries({ queryKey: ['events'] });
          toast.info('Event status changed to "Pending Approval" — new items require admin review.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
      toast.success(editService ? 'Service updated successfully' : 'Service added successfully');
      onOpenChange(false);
      setFormData({ name: '', description: '', price: '', capacity: '' });
    },
    onError: (error) => {
      toast.error(`Failed to ${editService ? 'update' : 'add'} service: ` + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          <DialogDescription>
            {editService ? 'Update details for this service.' : 'Create a new purchasable service for this event.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Gala Dinner, Workshop Access"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ({currency})</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (editService ? 'Updating...' : 'Adding...') : (editService ? 'Update Service' : 'Add Service')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
