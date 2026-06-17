import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Search, Loader2, Building2, Calendar, CheckCircle, XCircle, Gift, Download, X } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAttendees } from '@/hooks/useAttendees';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { format } from 'date-fns';
import { AttendeeServicesModal } from '@/components/attendees/AttendeeServicesModal';

interface SelectedAttendee {
  id: string;
  name: string;
  eventId: string;
}

export default function Attendees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<SelectedAttendee | null>(null);
  const { profile } = useAuth();
  const isSuperAdmin = isAdmin(profile?.role);
  
  // Read filters from URL on mount
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    const eventFromUrl = searchParams.get('event');
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl);
    }
    if (eventFromUrl) {
      setEventFilter(eventFromUrl);
    }
  }, [searchParams]);

  const { data: attendees, isLoading } = useAttendees(searchQuery);
  const { data: events } = useEvents();

  // Filter attendees by status and event if filters are active
  const filteredAttendees = attendees?.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (eventFilter && a.event_id !== eventFilter) return false;
    return true;
  });

  const clearStatusFilter = () => {
    setStatusFilter(null);
    searchParams.delete('status');
    setSearchParams(searchParams);
  };

  const clearEventFilter = () => {
    setEventFilter(null);
    searchParams.delete('event');
    setSearchParams(searchParams);
  };

  const clearAllFilters = () => {
    setStatusFilter(null);
    setEventFilter(null);
    setSearchParams(new URLSearchParams());
  };

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

  const formatCsvCell = (value: string): string => {
    // Always wrap in double quotes and escape existing quotes for European Excel
    return `"${value.replace(/"/g, '""')}"`;
  };

  const formatEuropeanDecimal = (value: number): string => {
    // Format with comma as decimal separator for European locale
    return value.toFixed(2).replace('.', ',');
  };

  const formatEuropeanDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy HH:mm');
  };

  const translateStatus = (status: string | null): string => {
    switch (status) {
      case 'approved': return 'Odobreno';
      case 'pending': return 'Na čekanju';
      case 'cancelled': return 'Otkazano';
      default: return status || '';
    }
  };

  const exportToCSV = () => {
    if (!attendees || attendees.length === 0) return;

    // Croatian headers as requested
    const headers = [
      'Ime',
      'Prezime', 
      'Email',
      'Tvrtka/Organizacija',
      'Ustanova',
      'Uloga',
      'Kotizacija',
      'Cijena (EUR)',
      'Plaćeno',
      'Status'
    ];

    const dataToExport = filteredAttendees || attendees;
    const rows = dataToExport.map((attendee) => [
      formatCsvCell(attendee.first_name || ''),
      formatCsvCell(attendee.last_name || ''),
      formatCsvCell(attendee.email || ''),
      formatCsvCell(attendee.institution || ''),
      formatCsvCell(attendee.event_institution_name || ''),
      formatCsvCell(attendee.event_name || ''),
      formatCsvCell(attendee.event_name || ''), // Ticket type placeholder - uses event name
      formatCsvCell(formatEuropeanDecimal(0)), // Price placeholder with European decimal
      formatCsvCell(attendee.checked_in ? 'Da' : 'Ne'),
      formatCsvCell(translateStatus(attendee.status))
    ]);

    // Use semicolon delimiter for European Excel compatibility
    const csvContent = [
      headers.map(h => formatCsvCell(h)).join(';'),
      ...rows.map((row) => row.join(';'))
    ].join('\n');

    // UTF-8 BOM for proper Excel encoding of Croatian characters
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={eventFilter || 'all'}
          onValueChange={(value) => {
            const newFilter = value === 'all' ? null : value;
            setEventFilter(newFilter);
            if (newFilter) {
              searchParams.set('event', newFilter);
            } else {
              searchParams.delete('event');
            }
            setSearchParams(searchParams);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {events?.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter || eventFilter) && (
          <div className="flex items-center gap-2 flex-wrap">
            {statusFilter && (
              <Badge variant="secondary" className="px-3 py-1.5">
                Status: {statusFilter === 'approved' ? 'Paid' : statusFilter}
                <button 
                  onClick={clearStatusFilter}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {eventFilter && (
              <Badge variant="secondary" className="px-3 py-1.5">
                Filtered by Event
                <button 
                  onClick={clearEventFilter}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(statusFilter && eventFilter) && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAttendees && filteredAttendees.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tvrtka/Org.</TableHead>
                  <TableHead>Event</TableHead>
                  {isSuperAdmin && <TableHead>Institution</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.map((attendee) => (
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
                    <TableCell
                      className="text-sm text-muted-foreground truncate max-w-[140px]"
                      title={attendee.institution || ''}
                    >
                      {attendee.institution || '—'}
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
