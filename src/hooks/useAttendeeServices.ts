import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendeePurchase {
  id: string;
  attendee_id: string;
  service_id: string;
  status: string;
  created_at: string;
  service_name: string;
  service_price: number;
  service_currency: string;
}

export interface EventService {
  id: string;
  event_id: string;
  name: string;
  price: number;
  description: string | null;
  currency: string;
}

export function useAttendeePurchases(attendeeId: string | null) {
  return useQuery({
    queryKey: ['attendee-purchases', attendeeId],
    queryFn: async (): Promise<AttendeePurchase[]> => {
      if (!attendeeId) return [];

      const { data, error } = await supabase
        .from('attendee_purchases')
        .select(`
          *,
          event_services:service_id (
            name,
            price,
            currency
          )
        `)
        .eq('attendee_id', attendeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((purchase: any) => ({
        id: purchase.id,
        attendee_id: purchase.attendee_id,
        service_id: purchase.service_id,
        status: purchase.status || 'pending',
        created_at: purchase.created_at,
        service_name: purchase.event_services?.name || 'Unknown Service',
        service_price: purchase.event_services?.price || 0,
        service_currency: purchase.event_services?.currency || 'EUR',
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
      return data || [];
    },
    enabled: !!eventId,
  });
}

export function useAddPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendeeId, serviceId }: { attendeeId: string; serviceId: string }) => {
      const { data, error } = await supabase
        .from('attendee_purchases')
        .insert({
          attendee_id: attendeeId,
          service_id: serviceId,
          status: 'pending',
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
        .from('attendee_purchases')
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
      const { error } = await supabase
        .from('attendee_purchases')
        .update({ status })
        .eq('id', purchaseId);

      if (error) throw error;
      return { attendeeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendee-purchases', data.attendeeId] });
    },
  });
}
