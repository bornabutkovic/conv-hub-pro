import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isElevatedRole, isSuperAdmin, isAdmin } from '@/lib/roles';
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
    queryKey: ['dashboard-stats-full', institutionUuid, isElevated, profile?.role, selectedEventId],
    queryFn: async (): Promise<DashboardStats> => {
      let eventIds: string[] = [];

      if (selectedEventId && selectedEventId !== 'all') {
        eventIds = [selectedEventId];
      } else {
        let eventsQuery = supabase.from('events').select('id');

        // For event_organizer: filter by institution_uuid
        if (!isSuperAdmin(profile?.role) && !isAdmin(profile?.role) && profile?.institution_uuid) {
          eventsQuery = supabase
            .from('events')
            .select('id')
            .eq('institution_uuid', profile.institution_uuid);
        }

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

      // Fetch service order_items with their order status
      const { data: serviceItems } = await supabase
        .from('order_items')
        .select(`
          id,
          total_price,
          order_id,
          orders(status, event_id)
        `)
        .eq('item_type', 'service')
        .not('service_id', 'is', null);

      // Filter to only items belonging to our eventIds
      const relevantServiceItems = (serviceItems || []).filter(
        (i: any) => eventIds.includes(i.orders?.event_id)
      );

      const addonRevenue = relevantServiceItems
        .filter((i: any) => i.orders?.status === 'paid')
        .reduce((sum: number, i: any) => sum + Number(i.total_price || 0), 0);

      const addonPending = relevantServiceItems
        .filter((i: any) => ['issued', 'draft'].includes(i.orders?.status))
        .reduce((sum: number, i: any) => sum + Number(i.total_price || 0), 0);

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

      const totalRevenue = ticketRevenue + addonRevenue;
      const totalPending = ticketPending + addonPending;

      // Ticket distribution / Revenue by event
      let ticketDistribution: { name: string; value: number; color: string }[] = [];
      const isAllEvents = !selectedEventId || selectedEventId === 'all';

      if (isAllEvents) {
        // Revenue by Event — group attendees by event_id, sum price_paid where paid
        const revenueByEvent: Record<string, { name: string; revenue: number }> = {};
        const { data: allEvents } = await supabase
          .from('events')
          .select('id, name')
          .in('id', eventIds);
        const eventNameMap = new Map((allEvents || []).map(e => [e.id, e.name]));

        (attendees || []).forEach(a => {
          if (a.payment_status !== 'paid') return;
          const eventId = a.event_id;
          const eventName = eventNameMap.get(eventId) || 'Unknown Event';
          if (!revenueByEvent[eventId]) {
            revenueByEvent[eventId] = { name: eventName, revenue: 0 };
          }
          revenueByEvent[eventId].revenue += Number(a.price_paid || 0);
        });

        const sorted = Object.values(revenueByEvent).sort((a, b) => b.revenue - a.revenue);
        const top = sorted.slice(0, 6);
        const others = sorted.slice(6);
        const othersTotal = others.reduce((sum, e) => sum + e.revenue, 0);
        const entries = othersTotal > 0 ? [...top, { name: 'Others', revenue: othersTotal }] : top;

        ticketDistribution = entries
          .filter(e => e.revenue > 0)
          .map((e, index) => ({
            name: e.name,
            value: e.revenue,
            color: CHART_COLORS[index % CHART_COLORS.length],
          }));
      } else {
        // Single event — ticket tier breakdown
        const ticketCounts: Record<string, number> = {};
        (ticketTiers || []).forEach(tt => { ticketCounts[tt.name] = 0; });
        const tierMap2 = new Map((ticketTiers || []).map(tt => [tt.id, tt.name]));
        (attendees || []).forEach(a => {
          const tierName = tierMap2.get(a.ticket_tier_id || '') || 'No Tier';
          ticketCounts[tierName] = (ticketCounts[tierName] || 0) + 1;
        });
        ticketDistribution = Object.entries(ticketCounts)
          .filter(([_, value]) => value > 0)
          .map(([name, value], index) => ({
            name,
            value,
            color: CHART_COLORS[index % CHART_COLORS.length],
          }));
      }

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
      const activityTierMap = new Map((ticketTiers || []).map(tt => [tt.id, tt.name]));
      const recentActivity: DashboardStats['recentActivity'] = [];
      (attendees || []).slice(0, 5).forEach(attendee => {
        const tierName = activityTierMap.get(attendee.ticket_tier_id || '') || 'Event';
        recentActivity.push({
          id: `reg-${attendee.id}`,
          userName: `${attendee.first_name} ${attendee.last_name}`,
          action: 'registeredFor',
          detail: tierName,
          timestamp: attendee.created_at || new Date().toISOString(),
          type: 'registration',
        });
      });

      recentActivity.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        revenue: { ticketRevenue, ticketPending, addonRevenue, addonPending, totalRevenue, totalPending },
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
