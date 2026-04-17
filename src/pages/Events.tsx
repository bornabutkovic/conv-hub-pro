import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventCard } from '@/components/events/EventCard';
import { useEvents, EventStatus, Event } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin, isSuperAdmin } from '@/lib/roles';

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

function sortEvents(events: Event[], sort: SortOption): Event[] {
  return [...events].sort((a, b) => {
    switch (sort) {
      case 'date-desc':
        return (b.start_date ?? '').localeCompare(a.start_date ?? '');
      case 'date-asc':
        return (a.start_date ?? '').localeCompare(b.start_date ?? '');
      case 'name-asc':
        return (a.name ?? '').localeCompare(b.name ?? '');
      case 'name-desc':
        return (b.name ?? '').localeCompare(a.name ?? '');
      default:
        return 0;
    }
  });
}

export default function Events() {
  const [statusFilter, setStatusFilter] = useState<EventStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);
  const userIsSuperAdmin = isSuperAdmin(profile?.role);

  const { data: events, isLoading } = useEvents(statusFilter);

  // Find pending_approval events for admin banner
  const { data: allEvents } = useEvents('all');
  const pendingEvents = userIsAdmin
    ? (allEvents || []).filter(e => e.status === 'pending_approval')
    : [];

  const sortedEvents = useMemo(
    () => (events ? sortEvents(events, sortOption) : []),
    [events, sortOption]
  );

  return (
    <div className="space-y-6">
      {/* Admin banner for events needing review */}
      {userIsAdmin && pendingEvents.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <ClipboardList className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="space-y-1">
              {pendingEvents.map(event => (
                <div key={event.id}>
                  📋 <button
                    className="font-medium underline hover:no-underline"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    {event.name}
                  </button>{' '}
                  has new items pending your approval
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage all your events in one place
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/events/new')}>
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as EventStatus)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="pending_approval">
              Pending Approval
              {userIsAdmin && pendingEvents.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingEvents.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            {userIsSuperAdmin && (
              <TabsTrigger value="archived">Archived</TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Date (newest)</SelectItem>
            <SelectItem value="date-asc">Date (oldest)</SelectItem>
            <SelectItem value="name-asc">Name (A→Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z→A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedEvents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium text-muted-foreground">
              {statusFilter === 'all'
                ? 'No events yet'
                : `No ${statusFilter.replace('_', ' ')} events`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {statusFilter === 'all'
                ? 'No events found. If you believe this is an error, please contact the Admin.'
                : `You don't have any ${statusFilter.replace('_', ' ')} events at the moment.`}
            </p>
            <Button
              className="gap-2"
              onClick={() => navigate('/events/new')}
            >
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}