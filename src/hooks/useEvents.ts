import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

export type EventStatus = 'all' | 'draft' | 'pending_approval' | 'active' | 'completed';

export interface Event {
  id: string;
  name: string;
  event_id: string | null;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  venue_name: string | null;
  created_at: string | null;
  institution_uuid: string | null;
  institution_name?: string | null;
}

export function useEvents(statusFilter: EventStatus = 'all') {
  const { profile, user } = useAuth();

  return useQuery({
    queryKey: ['events', user?.id, profile?.role, statusFilter],
    queryFn: async (): Promise<Event[]> => {
      // For event_organizer: only show events they have membership for
      if (!isAdmin(profile?.role)) {
        const { data: memberships, error: memErr } = await supabase
          .from('event_memberships')
          .select('event_id')
          .eq('user_id', user!.id);

        if (memErr) {
          console.error('[useEvents] Membership fetch error:', memErr);
          throw memErr;
        }

        const eventIds = (memberships || [])
          .map((m) => m.event_id)
          .filter(Boolean) as string[];

        if (eventIds.length === 0) return [];

        let query = supabase
          .from('events')
          .select(`*, institutions:institution_uuid (name)`)
          .in('id', eventIds)
          .order('start_date', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((event: any) => ({
          ...event,
          institution_name: event.institutions?.name || null,
        })) as Event[];
      }

      // Admin: see all events
      let query = supabase
        .from('events')
        .select(`*, institutions:institution_uuid (name)`)
        .order('start_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((event: any) => ({
        ...event,
        institution_name: event.institutions?.name || null,
      })) as Event[];
    },
    enabled: !!user,
  });
}
