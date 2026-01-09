import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EventStatus = 'all' | 'active' | 'draft' | 'past';

interface Event {
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
}

export function useEvents(statusFilter: EventStatus = 'all') {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['events', profile?.institution_uuid, statusFilter],
    queryFn: async (): Promise<Event[]> => {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      // Filter by institution if user has one
      if (profile?.institution_uuid) {
        query = query.eq('institution_uuid', profile.institution_uuid);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Type assertion since status and institution_uuid aren't in generated types yet
      return (data || []) as Event[];
    },
    enabled: !!profile,
  });
}
