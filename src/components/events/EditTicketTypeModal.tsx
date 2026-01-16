import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import type { Tables } from '@/integrations/supabase/types';

type TicketType = Tables<'ticket_types'>;

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket name is required').max(100),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  vat_rate: z.coerce.number().min(0).max(100).default(25),
  quota: z.coerce.number().min(1).optional().or(z.literal('')),
  category: z.string().default('registration'),
  description: z.string().max(500).optional(),
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

export function EditTicketTypeModal({
  open,
  onOpenChange,
  ticket,
  eventId,
}: EditTicketTypeModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: ticket.name,
      price: ticket.price,
      vat_rate: ticket.vat_rate ?? 25,
      quota: ticket.quota ?? '',
      category: ticket.category ?? 'registration',
      description: ticket.description ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      name: ticket.name,
      price: ticket.price,
      vat_rate: ticket.vat_rate ?? 25,
      quota: ticket.quota ?? '',
      category: ticket.category ?? 'registration',
      description: ticket.description ?? '',
    });
  }, [ticket, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: TicketTypeFormData) => {
      const { error } = await supabase
        .from('ticket_types')
        .update({
          name: data.name,
          price: data.price,
          vat_rate: data.vat_rate,
          quota: data.quota ? Number(data.quota) : null,
          category: data.category,
          description: data.description || null,
        })
        .eq('id', ticket.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types', eventId] });
      toast.success('Ticket type updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update ticket type');
      console.error('Update error:', error);
    },
  });

  const onSubmit = (data: TicketTypeFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Ticket Type</DialogTitle>
          <DialogDescription>
            Update the ticket type details
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Physician Early Bird" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (EUR) *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
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
                    <FormDescription>Default: 25%</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Leave empty for unlimited</FormDescription>
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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's included with this ticket?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
