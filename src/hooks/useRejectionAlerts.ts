import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

export function useRejectionAlerts() {
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

  return useQuery({
    queryKey: ['rejection-alerts', profile?.institution_uuid],
    queryFn: async () => {
      if (!profile?.institution_uuid) return { hasRejections: false };

      // Get user's events
      const { data: events } = await supabase
        .from('events')
        .select('id, status, rejection_reason')
        .eq('institution_uuid', profile.institution_uuid);

      if (!events || events.length === 0) return { hasRejections: false };

      const rejectedEvents = events.filter(
        (e: any) => e.status === 'rejected' && e.rejection_reason
      );

      const eventIds = events.map((e: any) => e.id);

      const { data: rejectedTiers } = await supabase
        .from('ticket_tiers')
        .select('id, rejection_reason')
        .in('event_id', eventIds)
        .eq('status', 'rejected')
        .not('rejection_reason', 'is', null);

      const { data: rejectedServices } = await supabase
        .from('event_services')
        .select('id, rejection_reason')
        .in('event_id', eventIds)
        .eq('status', 'rejected')
        .not('rejection_reason', 'is', null);

      const hasRejections =
        rejectedEvents.length > 0 ||
        (rejectedTiers?.length || 0) > 0 ||
        (rejectedServices?.length || 0) > 0;

      return { hasRejections };
    },
    enabled: !!profile?.institution_uuid && !userIsAdmin,
    staleTime: 30_000,
  });
}
