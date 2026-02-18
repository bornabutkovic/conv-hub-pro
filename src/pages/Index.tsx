import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventCard } from '@/components/events/EventCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { data: events, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['hub-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`*, institutions:institution_uuid (name)`)
        .order('start_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((event: any) => ({
        ...event,
        institution_name: event.institutions?.name || null,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Conwayo Hub</h1>
            <p className="text-muted-foreground">All events at a glance</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-6 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive">
            <p>Error loading events: {(error as Error).message}</p>
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-2">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">No events found.</p>
            <p className="text-sm text-muted-foreground">
              Check RLS policies for public access on the <code className="bg-muted px-1 rounded">events</code> table.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
