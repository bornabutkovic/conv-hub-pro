import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePickers } from '@/components/ui/date-range-pickers';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TranslatableFields } from './TranslatableFields';
import { useFormDraft } from '@/hooks/useFormDraft';

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  capacity: z.coerce.number().int().nonnegative().optional().nullable(),
  display_order: z.coerce.number().int().min(0).default(0),
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

type ServiceFormData = z.infer<typeof serviceSchema>;

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
    display_order?: number | null;
    sales_start?: string | null;
    sales_end?: string | null;
  } | null;
  eventStatus?: string | null;
}

export function AddServiceModal({ open, onOpenChange, eventId, currency, editService, eventStatus }: AddServiceModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      capacity: null,
      display_order: 0,
      sales_start: null,
      sales_end: null,
    },
  });

  const draftKey = editService ? `edit_service_${editService.id}` : `add_service_${eventId}`;
  const { clearDraft } = useFormDraft(form, draftKey, { enabled: open });

  const [enTranslations, setEnTranslations] = useState({
    name: (editService?.translations?.en?.name as string) || '',
    description: (editService?.translations?.en?.description as string) || '',
    auto_translated: !!(editService?.translations?.en?.auto_translated),
  });

  useEffect(() => {
    if (editService) {
      form.reset({
        name: editService.name,
        description: editService.description || '',
        price: Number(editService.price),
        capacity: editService.capacity ?? null,
        display_order: editService.display_order ?? 0,
        sales_start: editService.sales_start ? new Date(editService.sales_start) : null,
        sales_end: editService.sales_end ? new Date(editService.sales_end) : null,
      });
      const trans = (editService.translations as any)?.en || {};
      setEnTranslations({
        name: trans.name || '',
        description: trans.description || '',
        auto_translated: !!trans.auto_translated,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        capacity: null,
        display_order: 0,
        sales_start: null,
        sales_end: null,
      });
      setEnTranslations({ name: '', description: '', auto_translated: false });
    }
  }, [editService, form]);

  const mutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
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
        name: data.name,
        description: data.description || null,
        price: data.price,
        capacity: data.capacity ?? null,
        currency: currency,
        translations: translationsData,
        display_order: data.display_order ?? 0,
        sales_start: data.sales_start?.toISOString() || null,
        sales_end: data.sales_end?.toISOString() || null,
      };

      let savedId: string;

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
        savedId = editService.id;
      } else {
        // Set status based on role
        const insertPayload = userIsAdmin
          ? { ...serviceData, status: 'active', approved_by: profile?.id, approved_at: new Date().toISOString() }
          : { ...serviceData, status: 'pending_approval' };

        const { data: insertedData, error } = await supabase
          .from('event_services')
          .insert(insertPayload)
          .select('id')
          .single();
        if (error) throw error;
        savedId = insertedData.id;

        // Non-admin: create notification, do NOT change event status
        if (!userIsAdmin) {
          const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'An organizer';
          const { data: eventData } = await supabase.from('events').select('name').eq('id', eventId).single();
          const eventName = eventData?.name || 'an event';

          await supabase.from('admin_notifications').insert({
            event_id: eventId,
            type: 'new_service',
            message: `${profileName} added a new service "${data.name}" to "${eventName}" — review required`,
            created_by: profile?.id,
          });

          queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['events-with-pending-items'] });
          toast.info('New service submitted for review. It will appear once approved.');
        }
      }

      // Auto-translate after save
      try {
        await supabase.functions.invoke('translate-content', {
          body: { type: 'event_service', id: savedId, source_lang: 'hr' },
        });
      } catch (e) {
        console.warn('Auto-translate failed:', e);
      }
    },
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
      toast.success(editService ? 'Service updated successfully' : 'Service added successfully');
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(`Failed to ${editService ? 'update' : 'add'} service: ` + error.message);
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          <DialogDescription>
            {editService ? 'Update details for this service.' : 'Create a new purchasable service for this event.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gala Dinner, Workshop Access" maxLength={50} {...field} />
                  </FormControl>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Maks. 50 znakova — ovako se naziv ispisuje na BC ponudi.</p>
                    <p className={cn("text-xs text-muted-foreground", field.value?.length === 50 && "text-amber-600")}>
                      {(field.value || '').length}/50
                    </p>
                  </div>
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
                    <Textarea placeholder="Optional description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <TranslatableFields
              fields="name+description"
              hrName={form.watch('name')}
              hrDescription={form.watch('description')}
              enName={enTranslations.name}
              enDescription={enTranslations.description}
              autoTranslated={enTranslations.auto_translated}
              onEnNameChange={(v) => setEnTranslations(prev => ({ ...prev, name: v, auto_translated: false }))}
              onEnDescriptionChange={(v) => setEnTranslations(prev => ({ ...prev, description: v, auto_translated: false }))}
              translateType="event_service"
              translateId={editService?.id}
              canAutoTranslate={!!editService}
              onTranslated={() => queryClient.invalidateQueries({ queryKey: ['event-services', eventId] })}
              nameMaxLength={50}
              nameHelperText="Maks. 50 znakova — ovako se naziv ispisuje na BC ponudi."
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ({currency})</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                        min="0"
                        placeholder="Unlimited"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? null : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Redni broj prikaza</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? 0 : parseInt(v, 10));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Niži broj = viši prikaz u listi (0 = prvi)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DateRangePickers form={form} startName="sales_start" endName="sales_end" startLabel="Sales Start" endLabel="Sales End" />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editService ? 'Update Service' : 'Add Service'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
