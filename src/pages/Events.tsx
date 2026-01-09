import { useState } from 'react';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { useEvents, EventStatus } from '@/hooks/useEvents';

export default function Events() {
  const [statusFilter, setStatusFilter] = useState<EventStatus>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: events, isLoading, refetch } = useEvents(statusFilter);

  const handleEventCreated = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage all your events in one place
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(value) => setStatusFilter(value as EventStatus)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
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
                : `No ${statusFilter} events`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {statusFilter === 'all'
                ? 'Create your first event to start managing registrations, attendees, and more.'
                : `You don't have any ${statusFilter} events at the moment.`}
            </p>
            <Button
              className="gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateEventModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
}
