import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin, isAdmin, isPortalUser } from '@/lib/roles';

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
    queryKey: ['events', user?.id, profile?.role, profile?.institution_uuid, statusFilter],
    queryFn: async (): Promise<Event[]> => {
      const role = profile?.role;

      // super_admin: see ALL events
      if (isSuperAdmin(role)) {
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
      }

      // admin (Penta Admin): see their institution's events + ALL pending_approval events
      if (isAdmin(role)) {
        // Fetch institution events
        const institutionUuid = profile?.institution_uuid;
        let institutionEvents: any[] = [];

        if (institutionUuid) {
          let q = supabase
            .from('events')
            .select(`*, institutions:institution_uuid (name)`)
            .eq('institution_uuid', institutionUuid)
            .order('start_date', { ascending: false });

          if (statusFilter !== 'all') {
            q = q.eq('status', statusFilter);
          }

          const { data, error } = await q;
          if (error) throw error;
          institutionEvents = data || [];
        }

        // Also fetch ALL pending_approval events (from any institution)
        let pendingEvents: any[] = [];
        if (statusFilter === 'all' || statusFilter === 'pending_approval') {
          const { data, error } = await supabase
            .from('events')
            .select(`*, institutions:institution_uuid (name)`)
            .eq('status', 'pending_approval')
            .order('start_date', { ascending: false });

          if (error) throw error;
          pendingEvents = data || [];
        }

        // Merge and deduplicate
        const allEvents = [...institutionEvents, ...pendingEvents];
        const seen = new Set<string>();
        const unique = allEvents.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });

        return unique.map((event: any) => ({
          ...event,
          institution_name: event.institutions?.name || null,
        })) as Event[];
      }

      // event_organizer: see only their institution's events (no pending_approval from others)
      const institutionUuid = profile?.institution_uuid;
      if (!institutionUuid) return [];

      let query = supabase
        .from('events')
        .select(`*, institutions:institution_uuid (name)`)
        .eq('institution_uuid', institutionUuid)
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
