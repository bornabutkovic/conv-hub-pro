import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Tag, Users, DollarSign, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditEventModal } from '@/components/events/EditEventModal';
import { EventAttendeesTable } from '@/components/events/EventAttendeesTable';
import { EventServicesTable } from '@/components/events/EventServicesTable';

import { TicketTiersTable } from '@/components/events/TicketTiersTable';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: event, isLoading: eventLoading, refetch: refetchEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: attendees, isLoading: attendeesLoading } = useQuery({
    queryKey: ['event-attendees', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at,
          profile_id,
          profiles:profile_id (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('event_id', id!);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'past':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="link" onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </div>
    );
  }

  const totalAttendees = attendees?.length || 0;

  // Fetch event_memberships to calculate revenue from price_paid
  const { data: memberships } = useQuery({
    queryKey: ['event-memberships-revenue', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_memberships')
        .select('*')
        .eq('event_id', id!);
      
      if (error) throw error;
      return data as Array<{ price_paid?: number }>;
    },
    enabled: !!id,
  });

  const totalRevenue = (memberships || []).reduce(
    (sum, m) => sum + Number(m.price_paid || 0), 
    0
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/events')}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
            <Badge variant={getStatusVariant(event.status)} className="text-sm">
              {event.status || 'draft'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            {event.event_id && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                <span className="font-mono">{event.event_id}</span>
              </div>
            )}
            {event.start_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.start_date), 'PPP \'at\' p')}</span>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Event
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: event.currency || 'EUR',
              }).format(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {totalAttendees} registrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Attendees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered for this event
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Attendees, Tickets & Services */}
      <Tabs defaultValue="attendees" className="w-full">
        <TabsList>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="ticket-tiers">Ticket Tiers</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        <TabsContent value="attendees" className="mt-4">
          <EventAttendeesTable 
            attendees={attendees || []} 
            isLoading={attendeesLoading}
            eventId={event.id}
          />
        </TabsContent>
        <TabsContent value="ticket-tiers" className="mt-4">
          <TicketTiersTable 
            eventId={event.id} 
            currency={event.currency || 'EUR'} 
          />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <EventServicesTable 
            eventId={event.id} 
            currency={event.currency || 'EUR'} 
          />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <EditEventModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        event={event}
        onEventUpdated={refetchEvent}
      />
    </div>
  );
}
