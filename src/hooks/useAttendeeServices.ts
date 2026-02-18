import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendeePurchase {
  id: string;
  attendee_id: string | null;
  service_id: string | null;
  status: string;
  created_at: string;
  service_name: string;
  service_price: number;
  service_currency: string;
}

export interface EventService {
  id: string;
  event_id: string | null;
  name: string;
  price: number;
  description: string | null;
  currency: string | null;
}

export function useAttendeePurchases(attendeeId: string | null) {
  return useQuery({
    queryKey: ['attendee-purchases', attendeeId],
    queryFn: async (): Promise<AttendeePurchase[]> => {
      if (!attendeeId) return [];

      // Use order_items joined with event_services as the purchase record
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, attendee_id, service_id, created_at:order_id,
          event_services:service_id (name, price, currency)
        `)
        .eq('attendee_id', attendeeId)
        .not('service_id', 'is', null);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        attendee_id: item.attendee_id,
        service_id: item.service_id,
        status: 'paid',
        created_at: new Date().toISOString(),
        service_name: item.event_services?.name || 'Unknown Service',
        service_price: item.event_services?.price || 0,
        service_currency: item.event_services?.currency || 'EUR',
      }));
    },
    enabled: !!attendeeId,
  });
}

export function useEventServices(eventId: string | null) {
  return useQuery({
    queryKey: ['event-services', eventId],
    queryFn: async (): Promise<EventService[]> => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_services')
        .select('*')
        .eq('event_id', eventId)
        .order('name');

      if (error) throw error;
      return (data || []) as EventService[];
    },
    enabled: !!eventId,
  });
}

export function useAddPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendeeId, serviceId }: { attendeeId: string; serviceId: string }) => {
      // Get service details for price
      const { data: service } = await supabase
        .from('event_services')
        .select('name, price')
        .eq('id', serviceId)
        .single();

      const price = service?.price || 0;

      const { data, error } = await supabase
        .from('order_items')
        .insert({
          attendee_id: attendeeId,
          service_id: serviceId,
          description: service?.name || 'Service',
          unit_price: price,
          total_price: price,
          vat_amount: 0,
          quantity: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendee-purchases', variables.attendeeId] });
    },
  });
}

export function useRemovePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ purchaseId, attendeeId }: { purchaseId: string; attendeeId: string }) => {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;
      return { attendeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendee-purchases', data.attendeeId] });
    },
  });
}

export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ purchaseId, status, attendeeId }: { purchaseId: string; status: string; attendeeId: string }) => {
      // order_items doesn't have a status column, so this is a no-op for now
      return { attendeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendee-purchases', data.attendeeId] });
    },
  });
}
