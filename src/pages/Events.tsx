import { Calendar, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Events() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage all your events in one place
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground">
            No events yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Create your first event to start managing registrations, attendees, and more.
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
