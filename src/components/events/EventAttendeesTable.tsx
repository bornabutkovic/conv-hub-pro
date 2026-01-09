import { useState } from 'react';
import { format } from 'date-fns';
import { Users, Phone, Mail, Calendar, UserPlus } from 'lucide-react';
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
  created_at: string | null;
  profile_id: string | null;
  profiles: Profile | null;
}

interface EventAttendeesTableProps {
  attendees: Attendee[];
  isLoading: boolean;
  eventId: string;
}

export function EventAttendeesTable({ attendees, isLoading, eventId }: EventAttendeesTableProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'Registered';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  // Get phone from profile if available, otherwise from attendee record
  const getPhone = (attendee: Attendee) => {
    const profilePhone = attendee.profiles?.phone;
    const attendeePhone = attendee.phone;
    return profilePhone || attendeePhone || null;
  };

  // Get email from profile if available, otherwise from attendee record
  const getEmail = (attendee: Attendee) => {
    const profileEmail = attendee.profiles?.email;
    const attendeeEmail = attendee.email;
    return profileEmail || attendeeEmail || null;
  };

  // Get full name - prefer profile data, fallback to attendee data
  const getFullName = (attendee: Attendee) => {
    if (attendee.profiles?.first_name || attendee.profiles?.last_name) {
      return `${attendee.profiles.first_name || ''} ${attendee.profiles.last_name || ''}`.trim();
    }
    return `${attendee.first_name} ${attendee.last_name}`.trim();
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
              <CardDescription>
                Manage event registrations
              </CardDescription>
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

        <AddAttendeeModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          eventId={eventId}
        />
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
            <CardDescription>
              Manage event registrations
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Attendee Manually
          </Button>
        </CardHeader>
        <CardContent>
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
              {attendees.map((attendee) => {
                const phone = getPhone(attendee);
                const email = getEmail(attendee);
                
                return (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">
                      {getFullName(attendee)}
                    </TableCell>
                    <TableCell>
                      {phone ? (
                        <span className="font-mono text-sm">{phone}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No phone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {email || (
                        <span className="text-muted-foreground italic">No email</span>
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

      <AddAttendeeModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        eventId={eventId}
      />
    </>
  );
}
