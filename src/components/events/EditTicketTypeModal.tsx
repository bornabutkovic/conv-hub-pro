import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Info } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PriceTierRow, type PriceTier } from './PriceTierRow';
import type { Tables } from '@/integrations/supabase/types';

type TicketType = Tables<'ticket_types'>;

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100),
  description: z.string().max(500).optional(),
  bc_sku: z.string().min(1, 'BC SKU is required').max(50),
  quota: z.coerce.number().min(0, 'Capacity cannot be negative'),
  display_order: z.coerce.number().min(0).default(0),
  category: z.string().default('registration'),
  vat_rate: z.coerce.number().min(0).max(100).default(25),
});

type TicketTypeFormData = z.infer<typeof ticketTypeSchema>;

interface EditTicketTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketType;
  eventId: string;
}

const CATEGORY_OPTIONS = [
  { value: 'registration', label: 'Registration' },
  { value: 'dinner/social', label: 'Dinner/Social' },
  { value: 'workshop', label: 'Workshop' },
];

const createEmptyTier = (): PriceTier => ({
  name: '',
  price: 0,
  sales_start_at: '',
  sales_end_at: '',
});

const formatDateForInput = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

export function EditTicketTypeModal({
  open,
  onOpenChange,
  ticket,
  eventId,
}: EditTicketTypeModalProps) {
  const queryClient = useQueryClient();
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([createEmptyTier()]);

  // Fetch existing price tiers
  const { data: existingTiers } = useQuery({
    queryKey: ['price-tiers', ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_price_tiers')
        .select('*')
        .eq('ticket_type_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open && !!ticket.id,
  });

  const form = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: ticket.name,
      description: ticket.description ?? '',
      bc_sku: ticket.bc_sku ?? '',
      quota: ticket.quota ?? 0,
      display_order: ticket.display_order ?? 0,
      category: ticket.category ?? 'registration',
      vat_rate: ticket.vat_rate ?? 25,
    },
  });

  // Update form and tiers when ticket or existing tiers change
  useEffect(() => {
    form.reset({
      name: ticket.name,
      description: ticket.description ?? '',
      bc_sku: ticket.bc_sku ?? '',
      quota: ticket.quota ?? 0,
      display_order: ticket.display_order ?? 0,
      category: ticket.category ?? 'registration',
      vat_rate: ticket.vat_rate ?? 25,
    });
  }, [ticket, form]);

  useEffect(() => {
    if (existingTiers && existingTiers.length > 0) {
      setPriceTiers(
        existingTiers.map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          sales_start_at: formatDateForInput(t.sales_start_at),
          sales_end_at: formatDateForInput(t.sales_end_at),
        }))
      );
    } else if (open) {
      // If no tiers exist, create a default one with the ticket's price
      setPriceTiers([
        {
          name: 'Standard',
          price: ticket.price,
          sales_start_at: '',
          sales_end_at: '',
        },
      ]);
    }
  }, [existingTiers, open, ticket.price]);

  const updateMutation = useMutation({
    mutationFn: async (data: TicketTypeFormData) => {
      // Validate price tiers
      const validTiers = priceTiers.filter((t) => t.name.trim());
      if (validTiers.length === 0) {
        throw new Error('At least one price tier is required');
      }

      // Get the first tier's price as the main price
      const mainPrice = validTiers[0].price;

      // Update ticket type
      const { error: ticketError } = await supabase
        .from('ticket_types')
        .update({
          name: data.name,
          description: data.description || null,
          bc_sku: data.bc_sku,
          quota: data.quota || null,
          display_order: data.display_order,
          category: data.category,
          vat_rate: data.vat_rate,
          price: mainPrice,
        })
        .eq('id', ticket.id);

      if (ticketError) throw ticketError;

      // Delete existing price tiers
      const { error: deleteError } = await supabase
        .from('ticket_price_tiers')
        .delete()
        .eq('ticket_type_id', ticket.id);

      if (deleteError) throw deleteError;

      // Create new price tiers
      const tierInserts = validTiers.map((tier) => ({
        ticket_type_id: ticket.id,
        name: tier.name,
        price: tier.price,
        sales_start_at: tier.sales_start_at || null,
        sales_end_at: tier.sales_end_at || null,
      }));

      const { error: tiersError } = await supabase
        .from('ticket_price_tiers')
        .insert(tierInserts);

      if (tiersError) throw tiersError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types', eventId] });
      queryClient.invalidateQueries({ queryKey: ['price-tiers', ticket.id] });
      toast.success('Service updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update service');
      console.error('Update error:', error);
    },
  });

  const handleTierChange = (
    index: number,
    field: keyof PriceTier,
    value: string | number
  ) => {
    setPriceTiers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addTier = () => {
    setPriceTiers((prev) => [...prev, createEmptyTier()]);
  };

  const removeTier = (index: number) => {
    if (priceTiers.length > 1) {
      setPriceTiers((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const onSubmit = (data: TicketTypeFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Service / Ticket Type</DialogTitle>
          <DialogDescription>
            Update service details and pricing tiers
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Basic Info</h4>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name / Naziv usluge *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Physician Early Bird" {...field} />
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
                      <FormLabel>Description / Opis</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What's included with this service?"
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bc_sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BC SKU / Šifra artikla *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., REG-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quota"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Total Capacity / Kontingent *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ukupan broj dostupnih mjesta</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order / Redoslijed</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vat_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Section 2: Price Tiers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Price Tiers / Cjenovne razine
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Manage pricing options (e.g., Early Bird, Regular, Onsite)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTier}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tier
                  </Button>
                </div>

                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_100px_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Tier Name *</span>
                    <span>Price (€) *</span>
                    <span>Valid From</span>
                    <span>Valid Until</span>
                    <span></span>
                  </div>

                  {/* Tier Rows */}
                  {priceTiers.map((tier, index) => (
                    <PriceTierRow
                      key={tier.id || index}
                      tier={tier}
                      index={index}
                      onChange={handleTierChange}
                      onRemove={removeTier}
                      canRemove={priceTiers.length > 1}
                    />
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  * At least one price tier is required
                </p>
              </div>

              <Separator />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
