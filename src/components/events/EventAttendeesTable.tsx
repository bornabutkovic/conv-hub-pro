import { useState } from 'react';
import { format } from 'date-fns';
import { Users, Phone, Mail, Calendar, UserPlus, CheckCircle2, Circle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddAttendeeModal } from './AddAttendeeModal';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  payment_status: string | null;
  checked_in: boolean | null;
  scanned_at: string | null;
  created_at: string | null;
  profile_id: string | null;
  profiles: Profile | null;
}

interface EventAttendeesTableProps {
  attendees: Attendee[];
  isLoading: boolean;
  eventId: string;
}

type PaymentFilter = 'all' | 'paid' | 'pending' | 'overdue';

export function EventAttendeesTable({ attendees, isLoading, eventId }: EventAttendeesTableProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'approved': return 'Registered';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const getPaymentBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus || 'N/A'}</Badge>;
    }
  };

  const getPhone = (attendee: Attendee) => attendee.profiles?.phone || attendee.phone || null;
  const getEmail = (attendee: Attendee) => attendee.profiles?.email || attendee.email || null;
  const getFullName = (attendee: Attendee) => {
    if (attendee.profiles?.first_name || attendee.profiles?.last_name) {
      return `${attendee.profiles.first_name || ''} ${attendee.profiles.last_name || ''}`.trim();
    }
    return `${attendee.first_name} ${attendee.last_name}`.trim();
  };

  const filteredAttendees = paymentFilter === 'all'
    ? attendees
    : attendees.filter(a => a.payment_status === paymentFilter);

  const filterCounts = {
    all: attendees.length,
    paid: attendees.filter(a => a.payment_status === 'paid').length,
    pending: attendees.filter(a => a.payment_status === 'pending').length,
    overdue: attendees.filter(a => a.payment_status === 'overdue').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!attendees.length) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attendees
              </CardTitle>
              <CardDescription>Manage event registrations</CardDescription>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Attendee Manually
            </Button>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No registrations yet</h3>
            <p className="text-muted-foreground mb-4">
              Add attendees manually or wait for WhatsApp registrations.
            </p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Attendee
            </Button>
          </CardContent>
        </Card>
        <AddAttendeeModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} eventId={eventId} />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendees ({attendees.length})
            </CardTitle>
            <CardDescription>Manage event registrations</CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Attendee Manually
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="flex items-center gap-2 mb-4">
            {(['all', 'paid', 'pending', 'overdue'] as PaymentFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={paymentFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentFilter(filter)}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                <span className="ml-1.5 text-xs opacity-70">({filterCounts[filter]})</span>
              </Button>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Registration Date
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.map((attendee) => {
                const phone = getPhone(attendee);
                const email = getEmail(attendee);
                
                return (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">{getFullName(attendee)}</TableCell>
                    <TableCell>
                      {phone ? (
                        <span className="font-mono text-sm">{phone}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No phone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email || <span className="text-muted-foreground italic">No email</span>}
                    </TableCell>
                    <TableCell>{getPaymentBadge(attendee.payment_status)}</TableCell>
                    <TableCell>
                      {attendee.checked_in ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <div className="text-sm">
                            <span>Checked In</span>
                            {attendee.scanned_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(attendee.scanned_at), 'MMM d, HH:mm')}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Circle className="h-4 w-4" />
                          <span className="text-sm">Not checked in</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {attendee.created_at
                        ? format(new Date(attendee.created_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(attendee.status)}>
                        {getStatusLabel(attendee.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddAttendeeModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} eventId={eventId} />
    </>
  );
}
