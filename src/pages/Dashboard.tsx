import { DollarSign, Users, Clock, Crown, Plus, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { KPICard } from '@/components/dashboard/KPICard';
import { RegistrationChart } from '@/components/dashboard/RegistrationChart';
import { TicketDistributionChart } from '@/components/dashboard/TicketDistributionChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { useDashboardStats } from '@/hooks/useDashboardStats';

export default function Dashboard() {
  const { profile } = useAuth();
  const institutionUuid = profile?.institution_uuid;
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: stats, isLoading: loadingStats } = useDashboardStats();

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

      {/* KPI Cards Row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={isSuperAdmin ? "Platform Volume" : "Total Revenue"}
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={<DollarSign className="h-5 w-5" />}
          description={isSuperAdmin ? "GMV across all institutions" : "Tickets + Add-ons"}
          loading={loadingStats}
          variant={(stats?.totalRevenue || 0) > 0 ? 'success' : 'default'}
        />
        <KPICard
          title="Total Attendees"
          value={String(stats?.totalAttendees || 0)}
          icon={<Users className="h-5 w-5" />}
          description={isSuperAdmin ? "Across all events" : "Registered users"}
          loading={loadingStats}
        />
        <KPICard
          title="Pending Income"
          value={formatCurrency(stats?.pendingIncome || 0)}
          icon={<Clock className="h-5 w-5" />}
          description="Awaiting payment"
          loading={loadingStats}
          variant={(stats?.pendingIncome || 0) > 0 ? 'warning' : 'default'}
        />
        <KPICard
          title="VIP Ratio"
          value={`${(stats?.vipRatio || 0).toFixed(1)}%`}
          icon={<Crown className="h-5 w-5" />}
          description="Premium ticket holders"
          loading={loadingStats}
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
            {loadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : recentEvents && recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map((event) => (
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
