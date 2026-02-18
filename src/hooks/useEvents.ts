import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EventStatus = 'all' | 'active' | 'draft' | 'past';

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
  const isSuperAdmin = profile?.role === 'super_admin';

  return useQuery({
    queryKey: ['events', user?.id, profile?.role, statusFilter],
    queryFn: async (): Promise<Event[]> => {
      if (isSuperAdmin) {
        // Super admin sees ALL events
        let query = supabase
          .from('events')
          .select(`
            *,
            institutions:institution_uuid (name)
          `)
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

      // Regular users: fetch events via memberships + institution
      if (!user?.id) return [];

      // Get event IDs from memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('event_memberships')
        .select('event_id')
        .eq('user_id', user.id);

      if (membershipError) {
        console.warn('Membership query error (may be RLS):', membershipError);
      }

      const memberEventIds = (memberships || []).map(m => m.event_id).filter(Boolean) as string[];

      // Also get events from the user's institution
      let institutionEventIds: string[] = [];
      if (profile?.institution_uuid) {
        const { data: instEvents } = await supabase
          .from('events')
          .select('id')
          .eq('institution_uuid', profile.institution_uuid);
        institutionEventIds = (instEvents || []).map(e => e.id);
      }

      const eventIds = [...new Set([...memberEventIds, ...institutionEventIds])];
      
      if (eventIds.length === 0) return [];

      // Then fetch those events
      let query = supabase
        .from('events')
        .select(`
          *,
          institutions:institution_uuid (name)
        `)
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
    },
    enabled: !!user,
  });
}
