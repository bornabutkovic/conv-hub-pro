import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  FormDescription,
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

interface AddTicketTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddTicketTypeModal({
  open,
  onOpenChange,
  eventId,
}: AddTicketTypeModalProps) {
  const queryClient = useQueryClient();
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([createEmptyTier()]);

  const form = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      bc_sku: '',
      quota: 0,
      display_order: 0,
      category: 'registration',
      vat_rate: 25,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TicketTypeFormData) => {
      // Validate price tiers
      const validTiers = priceTiers.filter((t) => t.name.trim());
      if (validTiers.length === 0) {
        throw new Error('At least one price tier is required');
      }

      // Get the first tier's price as the main price
      const mainPrice = validTiers[0].price;

      // Create ticket type
      const { data: ticketType, error: ticketError } = await supabase
        .from('ticket_types')
        .insert({
          event_id: eventId,
          name: data.name,
          description: data.description || null,
          bc_sku: data.bc_sku,
          quota: data.quota || null,
          display_order: data.display_order,
          category: data.category,
          vat_rate: data.vat_rate,
          price: mainPrice,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create price tiers
      const tierInserts = validTiers.map((tier) => ({
        ticket_type_id: ticketType.id,
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
      toast.success('Service created successfully');
      form.reset();
      setPriceTiers([createEmptyTier()]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create service');
      console.error('Create error:', error);
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
    createMutation.mutate(data);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setPriceTiers([createEmptyTier()]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Service / Ticket Type</DialogTitle>
          <DialogDescription>
            Create a new service with flexible pricing tiers
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      Add multiple pricing options (e.g., Early Bird, Regular, Onsite)
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
                      key={index}
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
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Service'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
