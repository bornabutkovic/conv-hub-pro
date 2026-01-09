import { DollarSign, Users, Calendar, Plus, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, description, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const institutionUuid = profile?.institution_uuid;
  const isSuperAdmin = profile?.role === 'super_admin';

  // Fetch active events count
  const { data: activeEventsCount, isLoading: loadingEvents } = useQuery({
    queryKey: ['dashboard-active-events', institutionUuid, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      // Super admin sees all, regular users see only their institution
      if (!isSuperAdmin && institutionUuid) {
        query = query.eq('institution_uuid', institutionUuid);
      }
      
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile && (isSuperAdmin || !!institutionUuid),
  });

  // Fetch total attendees and revenue
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats', institutionUuid, isSuperAdmin],
    queryFn: async () => {
      // Get events (all for super admin, filtered for regular users)
      let eventsQuery = supabase.from('events').select('id, price');
      
      if (!isSuperAdmin && institutionUuid) {
        eventsQuery = eventsQuery.eq('institution_uuid', institutionUuid);
      }
      
      const { data: events, error: eventsError } = await eventsQuery;
      
      if (eventsError) throw eventsError;
      if (!events || events.length === 0) return { totalAttendees: 0, totalRevenue: 0 };

      const eventIds = events.map(e => e.id);
      const eventPrices = events.reduce((acc, e) => {
        acc[e.id] = e.price || 0;
        return acc;
      }, {} as Record<string, number>);

      // Get attendees for these events
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('event_id')
        .in('event_id', eventIds);
      
      if (attendeesError) throw attendeesError;

      const totalAttendees = attendees?.length || 0;
      const totalRevenue = attendees?.reduce((sum, att) => {
        return sum + (eventPrices[att.event_id || ''] || 0);
      }, 0) || 0;

      return { totalAttendees, totalRevenue };
    },
    enabled: !!profile && (isSuperAdmin || !!institutionUuid),
  });

  // Fetch recent events
  const { data: recentEvents, isLoading: loadingRecent } = useQuery({
    queryKey: ['dashboard-recent-events', institutionUuid, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          id, name, slug, start_date, status,
          institutions:institution_uuid (name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (!isSuperAdmin && institutionUuid) {
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

  const isLoading = loadingEvents || loadingStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/events">
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={isSuperAdmin ? "Total Platform Volume" : "Total Revenue"}
          value={`€${(statsData?.totalRevenue || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-5 w-5" />}
          description={isSuperAdmin ? "GMV across all institutions" : "From all events"}
          loading={isLoading}
        />
        <StatCard
          title="Total Attendees"
          value={String(statsData?.totalAttendees || 0)}
          icon={<Users className="h-5 w-5" />}
          description={isSuperAdmin ? "Across all institutions" : "Across all events"}
          loading={isLoading}
        />
        <StatCard
          title="Active Events"
          value={String(activeEventsCount || 0)}
          icon={<Calendar className="h-5 w-5" />}
          description={isSuperAdmin ? "Platform-wide" : "Currently running"}
          loading={isLoading}
        />
      </div>

      {/* Recent Events Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        {loadingRecent ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentEvents && recentEvents.length > 0 ? (
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{event.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                    <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                      {event.status || 'draft'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                No events yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first event to get started
              </p>
              <Button asChild className="gap-2">
                <Link to="/events">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
