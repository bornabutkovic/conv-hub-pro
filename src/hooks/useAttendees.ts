import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

export interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  institution: string | null;
  status: string | null;
  checked_in: boolean | null;
  created_at: string | null;
  event_id: string | null;
  event_name?: string | null;
  event_institution_name?: string | null;
}

export function useAttendees(searchQuery: string = '') {
  const { profile } = useAuth();
  const isSuperAdmin = isAdmin(profile?.role);

  return useQuery({
    queryKey: ['attendees', profile?.institution_uuid, profile?.role, searchQuery],
    queryFn: async (): Promise<Attendee[]> => {
      let query = supabase
        .from('attendees')
        .select(`
          *,
          events:event_id (
            name,
            institution_uuid,
            institutions:institution_uuid (name)
          )
        `)
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by institution if not super admin (done client-side since we need to join through events)
      let filteredData = data || [];
      
      if (!isSuperAdmin && profile?.institution_uuid) {
        filteredData = filteredData.filter((att: any) => 
          att.events?.institution_uuid === profile.institution_uuid
        );
      }

      // Map the data to include event and institution names
      return filteredData.map((attendee: any) => ({
        ...attendee,
        event_name: attendee.events?.name || null,
        event_institution_name: attendee.events?.institutions?.name || null,
      })) as Attendee[];
    },
    enabled: !!profile,
  });
}
