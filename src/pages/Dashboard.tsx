import { useState, useEffect } from 'react';
import { Users, Clock, Plus, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin, isAdmin } from '@/lib/roles';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { KPICard } from '@/components/dashboard/KPICard';
import { RegistrationChart } from '@/components/dashboard/RegistrationChart';
import { TicketDistributionChart } from '@/components/dashboard/TicketDistributionChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { FinancialOverview } from '@/components/dashboard/FinancialOverview';
import { useDashboardStats } from '@/hooks/useDashboardStats';

export default function Dashboard() {
  const { profile } = useAuth();
  const institutionUuid = profile?.institution_uuid;
  const userIsSuperAdmin = isSuperAdmin(profile?.role);
  const userIsAdmin = isAdmin(profile?.role);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  // Fetch institution name for organizers
  const { data: institutionName } = useQuery({
    queryKey: ['institution-name', institutionUuid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('name')
        .eq('id', institutionUuid!)
        .single();
      if (error) return null;
      return data?.name || null;
    },
    enabled: !!institutionUuid && !userIsSuperAdmin,
  });

  // Fetch all events for the selector
  const { data: allEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['dashboard-events-selector', institutionUuid, userIsSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          id, name, slug, start_date, status,
          institutions:institution_uuid (name)
        `)
        .order('start_date', { ascending: false });
      
      if (!userIsSuperAdmin && institutionUuid) {
        query = query.eq('institution_uuid', institutionUuid);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((event: any) => ({
        ...event,
        institution_name: event.institutions?.name || null,
      }));
    },
    enabled: !!profile && (isSuperAdmin || !!institutionUuid),
  });

  // Auto-select the most recent active event on load
  useEffect(() => {
    if (allEvents && allEvents.length > 0 && selectedEventId === 'all') {
      const activeEvent = allEvents.find(e => e.status === 'active');
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else {
        // Fall back to first event if no active ones
        setSelectedEventId(allEvents[0].id);
      }
    }
  }, [allEvents]);

  const { data: stats, isLoading: loadingStats } = useDashboardStats(selectedEventId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const selectedEvent = allEvents?.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Header with Event Selector */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
            </p>
            {!isSuperAdmin && institutionName && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                <span>Managing: <strong className="text-foreground">{institutionName}</strong></span>
              </div>
            )}
          </div>
          <Button asChild className="gap-2 rounded-xl">
            <Link to="/events">
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Viewing Event:
          </span>
          {loadingEvents ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">All Events</span>
                </SelectItem>
                {allEvents?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <span>{event.name}</span>
                      {event.status === 'active' && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                      {event.start_date && (
                        <span className="text-xs text-muted-foreground">
                          ({format(new Date(event.start_date), 'MMM d, yyyy')})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedEvent && (
            <Link 
              to={`/events/${selectedEvent.id}`}
              className="text-sm text-primary hover:underline whitespace-nowrap"
            >
              View Details →
            </Link>
          )}
        </div>
      </div>

      {/* Financial Overview Section */}
      <FinancialOverview
        revenue={stats?.revenue || {
          ticketRevenue: 0,
          ticketPending: 0,
          addonRevenue: 0,
          addonPending: 0,
          totalRevenue: 0,
          totalPending: 0,
        }}
        loading={loadingStats}
        isSuperAdmin={isSuperAdmin}
        selectedEventId={selectedEventId}
      />

      {/* KPI Cards Row - Now 2 cards spanning wider */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <KPICard
          title="Total Attendees"
          value={String(stats?.totalAttendees || 0)}
          icon={<Users className="h-5 w-5" />}
          description={selectedEventId === 'all' 
            ? (isSuperAdmin ? "Across all events" : "Registered users") 
            : `For ${selectedEvent?.name || 'this event'}`
          }
          loading={loadingStats}
          href={selectedEventId === 'all' ? "/attendees" : `/attendees?event=${selectedEventId}`}
        />
        <KPICard
          title="Pending Income"
          value={formatCurrency(stats?.pendingIncome || 0)}
          icon={<Clock className="h-5 w-5" />}
          description="Awaiting payment"
          loading={loadingStats}
          variant={(stats?.pendingIncome || 0) > 0 ? 'warning' : 'default'}
          href={selectedEventId === 'all' ? "/attendees?status=pending" : `/attendees?status=pending&event=${selectedEventId}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <RegistrationChart 
          data={stats?.registrationTimeline || []} 
          loading={loadingStats} 
        />
        <TicketDistributionChart 
          data={stats?.ticketDistribution || []} 
          loading={loadingStats}
          eventName={selectedEventId !== 'all' ? selectedEvent?.name : undefined}
        />
      </div>

      {/* Bottom Section: Activity Feed + Recent Events */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ActivityFeed 
          activities={stats?.recentActivity || []} 
          loading={loadingStats} 
        />

        {/* Recent Events */}
        <Card>
          <div className="p-6 pb-2">
            <h3 className="text-lg font-semibold">Recent Events</h3>
            <p className="text-sm text-muted-foreground">Your latest created events</p>
          </div>
          <CardContent>
            {loadingEvents ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : allEvents && allEvents.length > 0 ? (
              <div className="space-y-3">
                {allEvents.slice(0, 3).map((event) => (
                  <Link key={event.id} to={`/events/${event.id}`}>
                    <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate">{event.name}</h4>
                        <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                          {event.status || 'draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{event.slug}</span>
                        {event.start_date && (
                          <span>• {format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                        )}
                        {isSuperAdmin && event.institution_name && (
                          <span className="flex items-center gap-1">
                            • <Building2 className="h-3 w-3" /> {event.institution_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No events yet</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/events">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
