import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Attendees() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendees</h1>
        <p className="text-muted-foreground">
          View and manage all your event attendees
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground">
            No attendees yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Attendees will appear here once they register for your events.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
