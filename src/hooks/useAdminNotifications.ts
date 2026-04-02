import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useAdminNotifications(limit?: number) {
  return useQuery({
    queryKey: ['admin-notifications', limit],
    queryFn: async () => {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

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
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin-notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('id, read_by')
        .is('resolved_at', null);
      if (error) throw error;
      return (data || []).filter(n => !(n.read_by || []).includes(user.id)).length;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) return;
      const { data: existing } = await supabase
        .from('admin_notifications')
        .select('read_by')
        .eq('id', notificationId)
        .single();
      const currentReadBy = existing?.read_by || [];
      if (currentReadBy.includes(user.id)) return;
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read_by: [...currentReadBy, user.id] })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { data, error: fetchErr } = await supabase
        .from('admin_notifications')
        .select('id, read_by')
        .is('resolved_at', null);
      if (fetchErr) throw fetchErr;
      const unread = (data || []).filter(n => !(n.read_by || []).includes(user.id));
      for (const n of unread) {
        const { error } = await supabase
          .from('admin_notifications')
          .update({ read_by: [...(n.read_by || []), user.id] })
          .eq('id', n.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
    },
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
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-unread-count'] });
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
