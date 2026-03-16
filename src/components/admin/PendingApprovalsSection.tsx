import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

interface PendingEvent {
  id: string;
  name: string;
  created_at: string | null;
  organizer_name: string | null;
}

export function PendingApprovalsSection() {
  const navigate = useNavigate();

  const { data: pendingEvents, isLoading } = useQuery({
    queryKey: ['pending-approval-events'],
    queryFn: async (): Promise<PendingEvent[]> => {
      // Fetch pending_approval events
      const { data: events, error } = await supabase
        .from('events')
        .select('id, name, created_at')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!events || events.length === 0) return [];

      // Fetch organizer names via event_memberships → profiles
      const eventIds = events.map((e) => e.id);
      const { data: memberships } = await supabase
        .from('event_memberships')
        .select('event_id, user_id, profiles:user_id (first_name, last_name)')
        .in('event_id', eventIds)
        .eq('role', 'organizer_admin');

      const organizerMap = new Map<string, string>();
      (memberships || []).forEach((m: any) => {
        if (m.event_id && m.profiles) {
          const name = [m.profiles.first_name, m.profiles.last_name].filter(Boolean).join(' ');
          if (name) organizerMap.set(m.event_id, name);
        }
      });

      return events.map((e) => ({
        ...e,
        organizer_name: organizerMap.get(e.id) || 'Unknown',
      }));
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingEvents || pendingEvents.length === 0) return null;

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="h-5 w-5 text-amber-600" />
          Pending Approvals
          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 ml-2">
            {pendingEvents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Organizer</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingEvents.map((event) => (
              <TableRow
                key={event.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <TableCell className="font-medium">{event.name}</TableCell>
                <TableCell className="text-muted-foreground">{event.organizer_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {event.created_at
                    ? format(new Date(event.created_at), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
