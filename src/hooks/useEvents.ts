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
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  return useQuery({
    queryKey: ['events', profile?.institution_uuid, profile?.role, statusFilter],
    queryFn: async (): Promise<Event[]> => {
      let query = supabase
        .from('events')
        .select(`
          *,
          institutions:institution_uuid (name)
        `)
        .order('start_date', { ascending: false });

      // Super admin sees all events, regular users only see their institution's
      if (!isSuperAdmin && profile?.institution_uuid) {
        query = query.eq('institution_uuid', profile.institution_uuid);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map the data to include institution_name
      return (data || []).map((event: any) => ({
        ...event,
        institution_name: event.institutions?.name || null,
      })) as Event[];
    },
    enabled: !!profile,
  });
}
