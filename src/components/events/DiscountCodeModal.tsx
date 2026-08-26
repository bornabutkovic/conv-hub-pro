import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePickers } from '@/components/ui/date-range-pickers';
import { toast } from 'sonner';

const discountCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  description: z.string().max(255).optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.coerce.number().positive('Must be greater than 0'),
  sales_start: z.date().optional().nullable(),
  sales_end: z.date().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  applies_to_all_tickets: z.boolean().default(false),
  applies_to_all_services: z.boolean().default(false),
  selected_tier_ids: z.array(z.string()).default([]),
  selected_service_ids: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.discount_type === 'percentage') {
    return data.discount_value <= 100;
  }
  return true;
}, {
  message: 'Percentage cannot exceed 100',
  path: ['discount_value'],
}).refine((data) => {
  if (data.sales_start && data.sales_end) {
    return data.sales_end > data.sales_start;
  }
  return true;
}, {
  message: 'Sales end date must be after start date',
  path: ['sales_end'],
});

type DiscountCodeFormData = z.infer<typeof discountCodeSchema>;

interface DiscountCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  currency: string;
  discountCode?: any | null;
  onSaved?: () => void;
}

export function DiscountCodeModal({
  open,
  onOpenChange,
  eventId,
  currency,
  discountCode,
  onSaved,
}: DiscountCodeModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isEditing = !!discountCode;

  const form = useForm<DiscountCodeFormData>({
    resolver: zodResolver(discountCodeSchema),
    defaultValues: {
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      sales_start: null,
      sales_end: null,
      status: 'active',
      applies_to_all_tickets: false,
      applies_to_all_services: false,
      selected_tier_ids: [],
      selected_service_ids: [],
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ['discount-modal-tiers', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('id, name, status')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId && open,
  });

  const { data: services } = useQuery({
    queryKey: ['discount-modal-services', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_services')
        .select('id, name, status')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId && open,
  });

  const { data: existingTargets } = useQuery({
    queryKey: ['discount-code-targets', discountCode?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_code_targets')
        .select('ticket_tier_id, event_service_id')
        .eq('discount_code_id', discountCode.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!discountCode?.id && open,
  });

  useEffect(() => {
    if (!open) return;
    if (discountCode) {
      form.reset({
        code: discountCode.code || '',
        description: discountCode?.description || '',
        discount_type: (discountCode.discount_type as 'percentage' | 'fixed_amount') || 'percentage',
        discount_value: Number(discountCode.discount_value) || 0,
        sales_start: discountCode.sales_start ? new Date(discountCode.sales_start) : null,
        sales_end: discountCode.sales_end ? new Date(discountCode.sales_end) : null,
        status: (discountCode.status as 'active' | 'inactive') || 'active',
        applies_to_all_tickets: !!discountCode.applies_to_all_tickets,
        applies_to_all_services: !!discountCode.applies_to_all_services,
        selected_tier_ids: (existingTargets || [])
          .map((t: any) => t.ticket_tier_id)
          .filter(Boolean),
        selected_service_ids: (existingTargets || [])
          .map((t: any) => t.event_service_id)
          .filter(Boolean),
      });
    } else {
      form.reset({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        sales_start: null,
        sales_end: null,
        status: 'active',
        applies_to_all_tickets: false,
        applies_to_all_services: false,
        selected_tier_ids: [],
        selected_service_ids: [],
      });
    }
  }, [discountCode, existingTargets, open, form]);

  const allTickets = form.watch('applies_to_all_tickets');
  const allServices = form.watch('applies_to_all_services');
  const selectedTierIds = form.watch('selected_tier_ids') || [];
  const selectedServiceIds = form.watch('selected_service_ids') || [];
  const discountType = form.watch('discount_type');

  const mutation = useMutation({
    mutationFn: async (data: DiscountCodeFormData) => {
      const payload = {
        event_id: eventId,
        code: data.code.trim(),
        description: data.description?.trim() || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        applies_to_all_tickets: data.applies_to_all_tickets,
        applies_to_all_services: data.applies_to_all_services,
        sales_start: data.sales_start?.toISOString() || null,
        sales_end: data.sales_end?.toISOString() || null,
        status: data.status,
      };

      let savedId: string;

      if (isEditing && discountCode) {
        const { error } = await supabase
          .from('discount_codes')
          .update(payload)
          .eq('id', discountCode.id);
        if (error) throw error;
        savedId = discountCode.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('discount_codes')
          .insert({ ...payload, created_by: profile?.id })
          .select('id')
          .single();
        if (error) throw error;
        savedId = inserted.id;
      }

      const { error: delError } = await supabase
        .from('discount_code_targets')
        .delete()
        .eq('discount_code_id', savedId);
      if (delError) throw delError;

      const rows: any[] = [];
      if (!data.applies_to_all_tickets) {
        for (const tierId of data.selected_tier_ids) {
          rows.push({ discount_code_id: savedId, ticket_tier_id: tierId });
        }
      }
      if (!data.applies_to_all_services) {
        for (const serviceId of data.selected_service_ids) {
          rows.push({ discount_code_id: savedId, event_service_id: serviceId });
        }
      }

      if (rows.length > 0) {
        const { error: insError } = await supabase
          .from('discount_code_targets')
          .insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes', eventId] });
      queryClient.invalidateQueries({ queryKey: ['discount-code-targets'] });
      toast.success(isEditing ? 'Discount code updated' : 'Discount code created');
      onOpenChange(false);
      onSaved?.();
    },
    onError: (error: any) => {
      const msg = error?.message || '';
      if (error?.code === '23505' || msg.toLowerCase().includes('duplicate key')) {
        toast.error('A code with this name already exists for this event');
      } else {
        toast.error(`Failed to save discount code: ${msg}`);
      }
    },
  });

  const onSubmit = (data: DiscountCodeFormData) => {
    const hasTiers = (tiers?.length || 0) > 0;
    const hasServices = (services?.length || 0) > 0;

    if (hasTiers && !data.applies_to_all_tickets && data.selected_tier_ids.length === 0) {
      toast.error('Select "All Tickets" or at least one specific ticket');
      return;
    }
    if (hasServices && !data.applies_to_all_services && data.selected_service_ids.length === 0) {
      toast.error('Select "All Services" or at least one specific service');
      return;
    }

    mutation.mutate(data);
  };

  const toggleId = (
    field: 'selected_tier_ids' | 'selected_service_ids',
    id: string,
    checked: boolean
  ) => {
    const current = form.getValues(field) || [];
    form.setValue(
      field,
      checked ? [...current, id] : current.filter((v) => v !== id),
      { shouldDirty: true }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Discount Code' : 'Add Discount Code'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="EARLY20"
                      className="font-mono uppercase"
                      maxLength={50}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                  <FormLabel>Opis / naziv koda</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Npr. Popust za organizatore EFM"
                      maxLength={255}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Interna napomena za administratore — nikad se ne prikazuje sudionicima.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed amount ({currency})</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value *</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0" {...field} />
                      </FormControl>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {discountType === 'percentage' ? '%' : currency}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DateRangePickers
              form={form}
              startName="sales_start"
              endName="sales_end"
              startLabel="Sales Start"
              endLabel="Sales End"
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Applies to</FormLabel>
              <div className="rounded-md border divide-y">
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all-tickets"
                      checked={allTickets}
                      onCheckedChange={(checked) => {
                        const val = checked === true;
                        form.setValue('applies_to_all_tickets', val, { shouldDirty: true });
                        if (val) form.setValue('selected_tier_ids', [], { shouldDirty: true });
                      }}
                    />
                    <Label htmlFor="all-tickets" className="font-medium cursor-pointer">
                      All Tickets
                    </Label>
                  </div>
                  {(tiers || []).map((tier) => (
                    <div key={tier.id} className="flex items-center gap-2 pl-6">
                      <Checkbox
                        id={`tier-${tier.id}`}
                        disabled={allTickets}
                        checked={selectedTierIds.includes(tier.id)}
                        onCheckedChange={(checked) =>
                          toggleId('selected_tier_ids', tier.id, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`tier-${tier.id}`}
                        className={`cursor-pointer text-sm ${allTickets ? 'text-muted-foreground opacity-60' : ''}`}
                      >
                        {tier.name}
                      </Label>
                    </div>
                  ))}
                  {(tiers || []).length === 0 && (
                    <p className="pl-6 text-sm text-muted-foreground">No ticket tiers yet.</p>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all-services"
                      checked={allServices}
                      onCheckedChange={(checked) => {
                        const val = checked === true;
                        form.setValue('applies_to_all_services', val, { shouldDirty: true });
                        if (val) form.setValue('selected_service_ids', [], { shouldDirty: true });
                      }}
                    />
                    <Label htmlFor="all-services" className="font-medium cursor-pointer">
                      All Services
                    </Label>
                  </div>
                  {(services || []).map((service) => (
                    <div key={service.id} className="flex items-center gap-2 pl-6">
                      <Checkbox
                        id={`service-${service.id}`}
                        disabled={allServices}
                        checked={selectedServiceIds.includes(service.id)}
                        onCheckedChange={(checked) =>
                          toggleId('selected_service_ids', service.id, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`service-${service.id}`}
                        className={`cursor-pointer text-sm ${allServices ? 'text-muted-foreground opacity-60' : ''}`}
                      >
                        {service.name}
                      </Label>
                    </div>
                  ))}
                  {(services || []).length === 0 && (
                    <p className="pl-6 text-sm text-muted-foreground">No services yet.</p>
                  )}
                </div>
              </div>
              <FormDescription>
                Choose which tickets and services this code can be applied to.
              </FormDescription>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditing ? 'Save Changes' : 'Create Discount Code'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
