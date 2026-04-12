import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRangePickers } from '@/components/ui/date-range-pickers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';
import { useFormDraft } from '@/hooks/useFormDraft';
import { TranslatableFields } from './TranslatableFields';

type TicketTier = Tables<'ticket_tiers'>;

const ticketTierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  sales_start: z.date().optional().nullable(),
  sales_end: z.date().optional().nullable(),
}).refine((data) => {
  if (data.sales_start && data.sales_end) {
    return data.sales_end > data.sales_start;
  }
  return true;
}, {
  message: 'Sales end date must be after start date',
  path: ['sales_end'],
});

type TicketTierFormData = z.infer<typeof ticketTierSchema>;

interface TicketTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  tier?: TicketTier | null;
  eventStatus?: string | null;
  isLocked?: boolean;
}

export function TicketTierModal({ open, onOpenChange, eventId, tier, eventStatus, isLocked = false }: TicketTierModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);
  const isEditing = !!tier;
  const [enName, setEnName] = useState('');
  const [enAutoTranslated, setEnAutoTranslated] = useState(false);

  const form = useForm<TicketTierFormData>({
    resolver: zodResolver(ticketTierSchema),
    defaultValues: {
      name: '',
      price: 0,
      description: '',
      capacity: null,
      sales_start: null,
      sales_end: null,
    },
  });

  const draftKey = tier ? `edit_ticket_tier_${tier.id}` : `add_ticket_tier_${eventId}`;
  const { clearDraft } = useFormDraft(form, draftKey, { enabled: open });

  useEffect(() => {
    if (tier) {
      form.reset({
        name: tier.name,
        price: Number(tier.price),
        description: tier.description || '',
        capacity: tier.capacity || null,
        sales_start: tier.sales_start ? new Date(tier.sales_start) : null,
        sales_end: tier.sales_end ? new Date(tier.sales_end) : null,
      });
      const trans = (tier.translations as any)?.en || {};
      setEnName(trans.name || '');
      setEnAutoTranslated(!!trans.auto_translated);
    } else {
      form.reset({
        name: '',
        price: 0,
        description: '',
        capacity: null,
        sales_start: null,
        sales_end: null,
      });
      setEnName('');
      setEnAutoTranslated(false);
    }
  }, [tier, form]);

  const mutation = useMutation({
    mutationFn: async (data: TicketTierFormData) => {
      // Determine status based on role
      const tierStatus = userIsAdmin ? 'active' : 'pending_approval';

      const translationsData = {
        ...((tier?.translations as any) || {}),
        en: {
          name: enName || undefined,
          auto_translated: enAutoTranslated,
        },
      };

      const payload = {
        name: data.name,
        price: data.price,
        description: data.description || null,
        capacity: data.capacity || null,
        sales_start: data.sales_start?.toISOString() || null,
        sales_end: data.sales_end?.toISOString() || null,
        event_id: eventId,
        translations: translationsData,
      };

      let savedId: string;

      if (isEditing && tier) {
        // If rejected, resubmit for approval
        const updatePayload = tier.status === 'rejected'
          ? { ...payload, status: 'pending_approval', rejection_reason: null }
          : payload;

        const { error } = await supabase
          .from('ticket_tiers')
          .update(updatePayload)
          .eq('id', tier.id);

        if (error) throw error;
        savedId = tier.id;
      } else {
        // For new tiers: set status based on role
        const insertPayload = userIsAdmin
          ? { ...payload, status: 'active', approved_by: profile?.id, approved_at: new Date().toISOString() }
          : { ...payload, status: 'pending_approval' };

        const { data: insertedData, error } = await supabase
          .from('ticket_tiers')
          .insert(insertPayload)
          .select('id')
          .single();

        if (error) throw error;
        savedId = insertedData.id;

        // Non-admin: create notification, do NOT change event status
        if (!userIsAdmin) {
          const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'An organizer';

          // Fetch event name for notification message
          const { data: eventData } = await supabase.from('events').select('name').eq('id', eventId).single();
          const eventName = eventData?.name || 'an event';

          await supabase.from('admin_notifications').insert({
            event_id: eventId,
            type: 'new_tier',
            message: `${profileName} added a new ticket type "${data.name}" to "${eventName}" — review required`,
            created_by: profile?.id,
          });

          queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['events-with-pending-items'] });
          toast.info('New ticket type submitted for review. It will appear on sale once approved.');
        }
      }

      // Auto-translate after save
      try {
        await supabase.functions.invoke('translate-content', {
          body: { type: 'ticket_tier', id: savedId, source_lang: 'hr' },
        });
      } catch (e) {
        console.warn('Auto-translate failed:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
      clearDraft();
      toast.success(isEditing ? 'Ticket tier updated successfully' : 'Ticket tier created successfully');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to save ticket tier');
      console.error(error);
    },
  });

  const onSubmit = (data: TicketTierFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Ticket Tier' : 'Add Ticket Tier'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isLocked && isEditing && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Name and price are locked — tickets already sold. You can change capacity or end sales early.</span>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Early Bird, Regular, VIP" {...field} disabled={isLocked && isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TranslatableFields
              fields="name"
              hrName={form.watch('name')}
              enName={enName}
              autoTranslated={enAutoTranslated}
              onEnNameChange={(v) => { setEnName(v); setEnAutoTranslated(false); }}
              translateType="ticket_tier"
              translateId={tier?.id}
              canAutoTranslate={isEditing}
              onTranslated={() => queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] })}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      disabled={isLocked && isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's included in this ticket tier..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter capacity"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : parseInt(value, 10));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for unlimited tickets
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DateRangePickers form={form} startName="sales_start" endName="sales_end" startLabel="Sales Start" endLabel="Sales End" />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {isEditing ? 'Save Changes' : 'Create Ticket Tier'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
