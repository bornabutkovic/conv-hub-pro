import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminNotification {
  id: string;
  event_id: string | null;
  type: string;
  message: string;
  created_by: string | null;
  created_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  read_by: string[] | null;
  event_name?: string;
}

export function useAdminNotifications() {
  return useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch event names for notifications
      const eventIds = [...new Set((data || []).map(n => n.event_id).filter(Boolean))];
      let eventMap: Record<string, string> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('events')
          .select('id, name')
          .in('id', eventIds as string[]);
        eventMap = Object.fromEntries((events || []).map(e => [e.id, e.name]));
      }

      return (data || []).map(n => ({
        ...n,
        event_name: n.event_id ? eventMap[n.event_id] || 'Unknown Event' : undefined,
      })) as AdminNotification[];
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useResolveNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });
}

export function usePendingApprovalItems(eventId: string) {
  return useQuery({
    queryKey: ['pending-approval-items', eventId],
    queryFn: async () => {
      const [tiersRes, servicesRes] = await Promise.all([
        supabase
          .from('ticket_tiers')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'pending_approval'),
        supabase
          .from('event_services')
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'pending_approval'),
      ]);

      if (tiersRes.error) throw tiersRes.error;
      if (servicesRes.error) throw servicesRes.error;

      return {
        tiers: tiersRes.data || [],
        services: servicesRes.data || [],
      };
    },
    enabled: !!eventId,
  });
}

export function useEventsWithPendingItems() {
  return useQuery({
    queryKey: ['events-with-pending-items'],
    queryFn: async () => {
      // Get all events that have pending tiers or services
      const [tiersRes, servicesRes] = await Promise.all([
        supabase
          .from('ticket_tiers')
          .select('event_id')
          .eq('status', 'pending_approval'),
        supabase
          .from('event_services')
          .select('event_id')
          .eq('status', 'pending_approval'),
      ]);

      const eventIds = new Set([
        ...((tiersRes.data || []).map(t => t.event_id).filter(Boolean)),
        ...((servicesRes.data || []).map(s => s.event_id).filter(Boolean)),
      ]);

      return eventIds as Set<string>;
    },
    refetchInterval: 30000,
  });
}
