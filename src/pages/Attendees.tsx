import { useState } from 'react';
import { Users, Search, Loader2, Building2, Calendar, CheckCircle, XCircle, Gift, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAttendees } from '@/hooks/useAttendees';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { AttendeeServicesModal } from '@/components/attendees/AttendeeServicesModal';

interface SelectedAttendee {
  id: string;
  name: string;
  eventId: string;
}

export default function Attendees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<SelectedAttendee | null>(null);
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  
  const { data: attendees, isLoading } = useAttendees(searchQuery);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const handleOpenServices = (attendee: { id: string; first_name: string; last_name: string; event_id: string | null }) => {
    if (!attendee.event_id) return;
    setSelectedAttendee({
      id: attendee.id,
      name: `${attendee.first_name} ${attendee.last_name}`,
      eventId: attendee.event_id,
    });
  };

  const exportToCSV = () => {
    if (!attendees || attendees.length === 0) return;

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Event',
      'Institution',
      'Status',
      'Checked In',
      'Registration Date'
    ];

    const rows = attendees.map((attendee) => [
      attendee.first_name || '',
      attendee.last_name || '',
      attendee.email || '',
      attendee.phone || '',
      attendee.event_name || '',
      attendee.event_institution_name || '',
      attendee.status || '',
      attendee.checked_in ? 'Yes' : 'No',
      attendee.created_at ? format(new Date(attendee.created_at), 'yyyy-MM-dd') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendees_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendees</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? 'View and manage attendees across all institutions' 
              : 'View and manage all your event attendees'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportToCSV}
          disabled={!attendees || attendees.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : attendees && attendees.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Event</TableHead>
                  {isSuperAdmin && <TableHead>Institution</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">
                      {attendee.first_name} {attendee.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {attendee.email && <div>{attendee.email}</div>}
                        {attendee.phone && <div className="text-muted-foreground">{attendee.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {attendee.event_name || 'Unknown Event'}
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {attendee.event_institution_name && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {attendee.event_institution_name}
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(attendee.status)}</TableCell>
                    <TableCell>
                      {attendee.checked_in ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {attendee.created_at 
                        ? format(new Date(attendee.created_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenServices(attendee)}
                        disabled={!attendee.event_id}
                        title="Manage Services"
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium text-muted-foreground">
              {searchQuery ? 'No attendees found' : 'No attendees yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery 
                ? 'Try a different search term.' 
                : 'Attendees will appear here once they register for your events.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Services Modal */}
      {selectedAttendee && (
        <AttendeeServicesModal
          open={!!selectedAttendee}
          onOpenChange={(open) => !open && setSelectedAttendee(null)}
          attendeeId={selectedAttendee.id}
          attendeeName={selectedAttendee.name}
          eventId={selectedAttendee.eventId}
        />
      )}
    </div>
  );
}
