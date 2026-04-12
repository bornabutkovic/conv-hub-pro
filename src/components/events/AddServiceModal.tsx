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
import { TranslatableFields } from './TranslatableFields';
import { useStateDraft } from '@/hooks/useFormDraft';

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
    status?: string | null;
    translations?: any;
  } | null;
  eventStatus?: string | null;
}

export function AddServiceModal({ open, onOpenChange, eventId, currency, editService, eventStatus }: AddServiceModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);
  const draftKey = editService ? `edit_service_${editService.id}` : `add_service_${eventId}`;
  const initialFormData = {
    name: editService?.name || '',
    description: editService?.description || '',
    price: editService?.price?.toString() || '',
    capacity: editService?.capacity?.toString() || '',
  };
  const { restoredData, saveDraft, clearDraft, wasRestored } = useStateDraft(draftKey, initialFormData, { enabled: open && !editService });
  const [formData, setFormData] = useState(editService ? initialFormData : restoredData);
  const [enTranslations, setEnTranslations] = useState({
    name: (editService?.translations?.en?.name as string) || '',
    description: (editService?.translations?.en?.description as string) || '',
    auto_translated: !!(editService?.translations?.en?.auto_translated),
  });

  const updateFormData = (newData: typeof formData) => {
    setFormData(newData);
    if (!editService) saveDraft(newData);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const translationsData = {
        ...((editService?.translations as any) || {}),
        en: {
          name: enTranslations.name || undefined,
          description: enTranslations.description || undefined,
          auto_translated: enTranslations.auto_translated,
        },
      };

      const serviceData = {
        event_id: eventId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        currency: currency,
        translations: translationsData,
      };

      if (editService) {
        // If rejected, resubmit for approval
        const updateData = editService.status === 'rejected'
          ? { ...serviceData, status: 'pending_approval', rejection_reason: null }
          : serviceData;

        const { error } = await supabase
          .from('event_services')
          .update(updateData)
          .eq('id', editService.id);
        if (error) throw error;
      } else {
        // Set status based on role
        const insertPayload = userIsAdmin
          ? { ...serviceData, status: 'active', approved_by: profile?.id, approved_at: new Date().toISOString() }
          : { ...serviceData, status: 'pending_approval' };

        const { error } = await supabase
          .from('event_services')
          .insert(insertPayload);
        if (error) throw error;

        // Non-admin: create notification, do NOT change event status
        if (!userIsAdmin) {
          const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'An organizer';
          const { data: eventData } = await supabase.from('events').select('name').eq('id', eventId).single();
          const eventName = eventData?.name || 'an event';

          await supabase.from('admin_notifications').insert({
            event_id: eventId,
            type: 'new_service',
            message: `${profileName} added a new service "${formData.name}" to "${eventName}" — review required`,
            created_by: profile?.id,
          });

          queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['events-with-pending-items'] });
          toast.info('New service submitted for review. It will appear once approved.');
        }
      }
    },
    onSuccess: () => {
      clearDraft();
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
                onChange={(e) => updateFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => updateFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <TranslatableFields
              fields="name+description"
              hrName={formData.name}
              hrDescription={formData.description}
              enName={enTranslations.name}
              enDescription={enTranslations.description}
              autoTranslated={enTranslations.auto_translated}
              onEnNameChange={(v) => setEnTranslations(prev => ({ ...prev, name: v, auto_translated: false }))}
              onEnDescriptionChange={(v) => setEnTranslations(prev => ({ ...prev, description: v, auto_translated: false }))}
              translateType="event_service"
              translateId={editService?.id}
              canAutoTranslate={!!editService}
              onTranslated={() => queryClient.invalidateQueries({ queryKey: ['event-services', eventId] })}
            />
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
                  onChange={(e) => updateFormData({ ...formData, price: e.target.value })}
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
                  onChange={(e) => updateFormData({ ...formData, capacity: e.target.value })}
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
