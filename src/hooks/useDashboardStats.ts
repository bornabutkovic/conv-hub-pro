import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  'hsl(24.6, 95%, 53.1%)', // Primary orange
  'hsl(210, 70%, 50%)',    // Blue
  'hsl(150, 60%, 45%)',    // Green
  'hsl(280, 60%, 55%)',    // Purple
  'hsl(45, 90%, 50%)',     // Yellow
  'hsl(0, 70%, 55%)',      // Red
  'hsl(180, 60%, 45%)',    // Teal
];

export function useDashboardStats(selectedEventId?: string | null) {
  const { profile } = useAuth();
  const institutionUuid = profile?.institution_uuid;
  const isSuperAdmin = profile?.role === 'super_admin';

  return useQuery({
    queryKey: ['dashboard-stats-full', institutionUuid, isSuperAdmin, selectedEventId],
    queryFn: async (): Promise<DashboardStats> => {
      let eventIds: string[] = [];

      if (selectedEventId && selectedEventId !== 'all') {
        // Single event selected
        eventIds = [selectedEventId];
      } else {
        // Get all events based on role
        let eventsQuery = supabase.from('events').select('id');
        if (!isSuperAdmin && institutionUuid) {
          eventsQuery = eventsQuery.eq('institution_uuid', institutionUuid);
        }
        const { data: events, error: eventsError } = await eventsQuery;
        if (eventsError) throw eventsError;
        eventIds = (events || []).map(e => e.id);
      }

      if (eventIds.length === 0) {
        return {
          revenue: {
            ticketRevenue: 0,
            ticketPending: 0,
            addonRevenue: 0,
            addonPending: 0,
            totalRevenue: 0,
            totalPending: 0,
          },
          totalAttendees: 0,
          pendingIncome: 0,
          ticketDistribution: [],
          registrationTimeline: [],
          recentActivity: [],
        };
      }

      // Get all attendees for these events
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select(`
          id, first_name, last_name, status, created_at, event_id
        `)
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      const attendeeIds = (attendees || []).map(a => a.id);

      // Get order items with ticket types for revenue calculation
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          id, total_price, attendee_id,
          ticket_types:ticket_type_id (id, name, category)
        `)
        .in('attendee_id', attendeeIds);

      if (orderItemsError) throw orderItemsError;

      // Get attendee purchases (add-ons)
      const { data: purchases, error: purchasesError } = await supabase
        .from('attendee_purchases')
        .select(`
          id, status, created_at, attendee_id,
          event_services:service_id (name, price)
        `)
        .in('attendee_id', attendeeIds)
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      // Get ticket types for the selected event(s) for distribution
      const { data: ticketTypes, error: ticketTypesError } = await supabase
        .from('ticket_types')
        .select('id, name, event_id')
        .in('event_id', eventIds);

      if (ticketTypesError) throw ticketTypesError;

      // Calculate revenue by status
      // Paid ticket revenue - from approved attendees
      const paidAttendees = (attendees || []).filter(a => a.status === 'approved');
      const paidAttendeeIds = paidAttendees.map(a => a.id);
      const paidOrderItems = (orderItems || []).filter(item => 
        paidAttendeeIds.includes(item.attendee_id || '')
      );
      const ticketRevenue = paidOrderItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
      
      // Pending ticket revenue
      const pendingAttendees = (attendees || []).filter(a => a.status === 'pending');
      const pendingAttendeeIds = pendingAttendees.map(a => a.id);
      const pendingOrderItems = (orderItems || []).filter(item => 
        pendingAttendeeIds.includes(item.attendee_id || '')
      );
      const ticketPending = pendingOrderItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
      
      // Paid add-on revenue
      const addonRevenue = (purchases || [])
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number((p.event_services as any)?.price || 0), 0);
      
      // Pending add-on revenue
      const addonPending = (purchases || [])
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number((p.event_services as any)?.price || 0), 0);
      
      // Total calculations
      const totalRevenue = ticketRevenue + addonRevenue;
      const totalPending = ticketPending + addonPending;
      const pendingIncome = totalPending;

      // Calculate ticket distribution based on ticket_types for the event(s)
      const ticketCounts: Record<string, number> = {};
      
      // Initialize counts for all ticket types
      (ticketTypes || []).forEach(tt => {
        ticketCounts[tt.name] = 0;
      });
      
      // Count actual orders by ticket type
      (orderItems || []).forEach(item => {
        const ticketName = (item.ticket_types as any)?.name;
        if (ticketName) {
          ticketCounts[ticketName] = (ticketCounts[ticketName] || 0) + 1;
        }
      });
      
      const ticketDistribution = Object.entries(ticketCounts)
        .filter(([_, value]) => value > 0) // Only show types with registrations
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }));

      // Calculate registration timeline (last 14 days)
      const today = startOfDay(new Date());
      const registrationTimeline: { date: string; count: number }[] = [];
      
      for (let i = 13; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = (attendees || []).filter(a => {
          if (!a.created_at) return false;
          return format(new Date(a.created_at), 'yyyy-MM-dd') === dateStr;
        }).length;
        registrationTimeline.push({
          date: format(date, 'MMM d'),
          count,
        });
      }

      // Build recent activity feed
      const recentActivity: DashboardStats['recentActivity'] = [];

      // Add recent registrations
      (attendees || []).slice(0, 5).forEach(attendee => {
        const orderItem = (orderItems || []).find(oi => oi.attendee_id === attendee.id);
        const ticketName = (orderItem?.ticket_types as any)?.name || 'Event';
        recentActivity.push({
          id: `reg-${attendee.id}`,
          userName: `${attendee.first_name} ${attendee.last_name}`,
          action: 'registered for',
          detail: ticketName,
          timestamp: attendee.created_at || new Date().toISOString(),
          type: 'registration',
        });
      });

      // Add recent purchases
      (purchases || []).slice(0, 5).forEach(purchase => {
        const attendee = (attendees || []).find(a => a.id === purchase.attendee_id);
        if (attendee) {
          recentActivity.push({
            id: `pur-${purchase.id}`,
            userName: `${attendee.first_name} ${attendee.last_name}`,
            action: 'purchased',
            detail: (purchase.event_services as any)?.name || 'Add-on',
            timestamp: purchase.created_at || new Date().toISOString(),
            type: 'purchase',
          });
        }
      });

      // Sort by timestamp and take top 5
      recentActivity.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        revenue: {
          ticketRevenue,
          ticketPending,
          addonRevenue,
          addonPending,
          totalRevenue,
          totalPending,
        },
        totalAttendees: (attendees || []).length,
        pendingIncome,
        ticketDistribution,
        registrationTimeline,
        recentActivity: recentActivity.slice(0, 5),
      };
    },
    enabled: !!profile && (isSuperAdmin || !!institutionUuid),
  });
}
