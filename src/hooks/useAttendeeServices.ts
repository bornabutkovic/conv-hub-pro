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
  order_id: string | null;
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

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          attendee_id,
          service_id,
          total_price,
          quantity,
          created_at,
          orders!inner(id, status, created_at),
          event_services!service_id(name, price, currency)
        `)
        .eq('attendee_id', attendeeId)
        .eq('item_type', 'service')
        .not('service_id', 'is', null);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        attendee_id: item.attendee_id,
        service_id: item.service_id,
        status: item.orders?.status || 'pending',
        created_at: item.orders?.created_at || new Date().toISOString(),
        service_name: item.event_services?.name || 'Unknown Service',
        service_price: item.event_services?.price || 0,
        service_currency: item.event_services?.currency || 'EUR',
        order_id: item.orders?.id || null,
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
      // Get attendee to find event_id
      const { data: attendee } = await supabase
        .from('attendees')
        .select('event_id')
        .eq('id', attendeeId)
        .single();

      // Get service details
      const { data: service } = await supabase
        .from('event_services')
        .select('name, price, event_id')
        .eq('id', serviceId)
        .single();

      const price = service?.price || 0;
      const eventId = attendee?.event_id || service?.event_id;

      // Create parent order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          event_id: eventId,
          attendee_id: attendeeId,
          status: 'paid' as any,
          payer_type: 'individual' as any,
          payment_method: 'manual',
          total_amount: price,
          payer_name: 'Manual add',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order_item
      const { data, error } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          attendee_id: attendeeId,
          service_id: serviceId,
          description: service?.name || 'Service',
          unit_price: price,
          total_price: price,
          vat_amount: 0,
          quantity: 1,
          item_type: 'service',
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
    mutationFn: async ({ purchaseId, status, attendeeId, orderId }: { 
      purchaseId: string; 
      status: string; 
      attendeeId: string;
      orderId: string | null;
    }) => {
      if (!orderId) return { attendeeId };

      const { error } = await supabase
        .from('orders')
        .update({ status: status as any })
        .eq('id', orderId);

      if (error) throw error;
      return { attendeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendee-purchases', data.attendeeId] });
    },
  });
}
