import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
      // RLS now handles visibility (super_admin sees all, others see
      // events via institution_uuid or event_memberships).
      // We just query all events and let RLS filter.
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

      if (error) {
        console.error('[useEvents] Supabase error:', error.code, error.message, error.details);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[useEvents] No events returned. This may be an RLS issue. User role:', profile?.role, 'Institution:', profile?.institution_uuid);
      }

      return (data || []).map((event: any) => ({
        ...event,
        institution_name: event.institutions?.name || null,
      })) as Event[];
    },
    enabled: !!user,
  });
}
