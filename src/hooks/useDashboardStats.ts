import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isElevatedRole } from '@/lib/roles';
import { subDays, format, startOfDay } from 'date-fns';

export interface RevenueBreakdown {
  ticketRevenue: number;
  ticketPending: number;
  addonRevenue: number;
  addonPending: number;
  totalRevenue: number;
  totalPending: number;
}

export interface DashboardStats {
  revenue: RevenueBreakdown;
  totalAttendees: number;
  pendingIncome: number;
  ticketDistribution: { name: string; value: number; color: string }[];
  registrationTimeline: { date: string; count: number }[];
  recentActivity: {
    id: string;
    userName: string;
    action: string;
    detail: string;
    timestamp: string;
    type: 'registration' | 'purchase';
  }[];
}

const CHART_COLORS = [
  'hsl(263, 70%, 58%)',
  'hsl(263, 84%, 35%)',
  'hsl(263, 50%, 72%)',
  'hsl(280, 60%, 55%)',
  'hsl(240, 50%, 60%)',
  'hsl(263, 40%, 45%)',
  'hsl(300, 50%, 50%)',
];

export function useDashboardStats(selectedEventId?: string | null) {
  const { profile } = useAuth();
  const institutionUuid = profile?.institution_uuid;
  const isElevated = isElevatedRole(profile?.role);

  return useQuery({
    queryKey: ['dashboard-stats-full', institutionUuid, isElevated, selectedEventId],
    queryFn: async (): Promise<DashboardStats> => {
      let eventIds: string[] = [];

      if (selectedEventId && selectedEventId !== 'all') {
        eventIds = [selectedEventId];
      } else {
        // RLS handles visibility - just fetch all accessible events
        let eventsQuery = supabase.from('events').select('id');
        const { data: events, error: eventsError } = await eventsQuery;
        if (eventsError) throw eventsError;
        eventIds = (events || []).map(e => e.id);
      }

      if (eventIds.length === 0) {
        return {
          revenue: { ticketRevenue: 0, ticketPending: 0, addonRevenue: 0, addonPending: 0, totalRevenue: 0, totalPending: 0 },
          totalAttendees: 0,
          pendingIncome: 0,
          ticketDistribution: [],
          registrationTimeline: [],
          recentActivity: [],
        };
      }

      // Get attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, payment_status, created_at, event_id, price_paid, ticket_tier_id')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      // Get ticket tiers for distribution
      const { data: ticketTiers, error: ticketTiersError } = await supabase
        .from('ticket_tiers')
        .select('id, name, event_id')
        .in('event_id', eventIds);

      if (ticketTiersError) throw ticketTiersError;

      // Revenue from attendees price_paid
      const paidAttendees = (attendees || []).filter(a => a.payment_status === 'paid');
      const ticketRevenue = paidAttendees.reduce((sum, a) => sum + Number(a.price_paid || 0), 0);

      const pendingAttendees = (attendees || []).filter(a => a.payment_status === 'pending');
      const ticketPending = pendingAttendees.reduce((sum, a) => sum + Number(a.price_paid || 0), 0);

      // No separate add-on tracking yet
      const totalRevenue = ticketRevenue;
      const totalPending = ticketPending;

      // Ticket distribution by tier
      const ticketCounts: Record<string, number> = {};
      (ticketTiers || []).forEach(tt => { ticketCounts[tt.name] = 0; });
      
      const tierMap = new Map((ticketTiers || []).map(tt => [tt.id, tt.name]));
      (attendees || []).forEach(a => {
        const tierName = tierMap.get(a.ticket_tier_id || '') || 'No Tier';
        ticketCounts[tierName] = (ticketCounts[tierName] || 0) + 1;
      });

      const ticketDistribution = Object.entries(ticketCounts)
        .filter(([_, value]) => value > 0)
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }));

      // Registration timeline (last 14 days)
      const today = startOfDay(new Date());
      const registrationTimeline: { date: string; count: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = (attendees || []).filter(a => {
          if (!a.created_at) return false;
          return format(new Date(a.created_at), 'yyyy-MM-dd') === dateStr;
        }).length;
        registrationTimeline.push({ date: format(date, 'MMM d'), count });
      }

      // Recent activity
      const recentActivity: DashboardStats['recentActivity'] = [];
      (attendees || []).slice(0, 5).forEach(attendee => {
        const tierName = tierMap.get(attendee.ticket_tier_id || '') || 'Event';
        recentActivity.push({
          id: `reg-${attendee.id}`,
          userName: `${attendee.first_name} ${attendee.last_name}`,
          action: 'registered for',
          detail: tierName,
          timestamp: attendee.created_at || new Date().toISOString(),
          type: 'registration',
        });
      });

      recentActivity.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        revenue: { ticketRevenue, ticketPending, addonRevenue: 0, addonPending: 0, totalRevenue, totalPending },
        totalAttendees: (attendees || []).length,
        pendingIncome: totalPending,
        ticketDistribution,
        registrationTimeline,
        recentActivity: recentActivity.slice(0, 5),
      };
    },
    enabled: !!profile,
  });
}
