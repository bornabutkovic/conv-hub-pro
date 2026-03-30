import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Tag, Users, DollarSign, Edit, Send, CheckCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventAttendeesTable } from '@/components/events/EventAttendeesTable';
import { EventServicesTable } from '@/components/events/EventServicesTable';
import { TicketTiersTable } from '@/components/events/TicketTiersTable';
import { ApprovalsTab } from '@/components/events/ApprovalsTab';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { usePendingApprovalItems } from '@/hooks/useAdminNotifications';
import { toast } from 'sonner';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'attendees';
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

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
        .from('attendee_invoice_summary')
        .select('*')
        .eq('event_id', id!);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: pendingItems } = usePendingApprovalItems(id || '');
  const pendingCount = (pendingItems?.tiers.length || 0) + (pendingItems?.services.length || 0);

  const handleStatusChange = async (newStatus: string) => {
    if (!event) return;
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id);
      
      if (error) throw error;

      const labels: Record<string, string> = {
        pending_approval: 'submitted for review',
        active: 'approved and activated',
        draft: 'returned to draft',
      };
      toast.success(`Event ${labels[newStatus] || 'updated'}!`);
      refetchEvent();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending_approval': return 'outline';
      case 'completed': return 'outline';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending_approval': return 'Pending Approval';
      case 'completed': return 'Completed';
      case 'draft': return 'Draft';
      default: return 'Draft';
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
  const paidAttendees = (attendees || []).filter(a => a.payment_status === 'paid');
  const pendingAttendees = (attendees || []).filter(a => a.payment_status === 'pending');
  const totalRevenue = paidAttendees.reduce((sum, a) => sum + Number(a.price_paid || 0), 0);
  const pendingRevenue = pendingAttendees.reduce((sum, a) => sum + Number(a.price_paid || 0), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: event.currency || 'EUR',
    }).format(amount);

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
              {getStatusLabel(event.status)}
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
        <div className="flex items-center gap-2">
          {!userIsAdmin && event.status === 'draft' && (
            <Button 
              variant="outline" 
              onClick={() => handleStatusChange('pending_approval')}
              disabled={isUpdatingStatus}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {userIsAdmin && event.status === 'pending_approval' && (
            <>
              <Button 
                onClick={() => handleStatusChange('active')}
                disabled={isUpdatingStatus}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Event
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleStatusChange('draft')}
                disabled={isUpdatingStatus}
              >
                Return to Draft
              </Button>
            </>
          )}
          <Button onClick={() => navigate(`/events/${event.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Event
          </Button>
        </div>
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
              {formatCurrency(totalRevenue)}
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-emerald-600">
                ✅ Paid: {paidAttendees.length} registrations — {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-amber-600">
                ⏳ Pending: {pendingAttendees.length} registrations — {formatCurrency(pendingRevenue)}
              </p>
            </div>
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

      {/* Tabs for Attendees, Tickets, Services & Approvals */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="ticket-tiers">Ticket Tiers</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          {userIsAdmin && (
            <TabsTrigger value="approvals" className="relative">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Approvals
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}
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
            eventStatus={event.status}
          />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <EventServicesTable 
            eventId={event.id} 
            currency={event.currency || 'EUR'}
            eventStatus={event.status}
          />
        </TabsContent>
        {userIsAdmin && (
          <TabsContent value="approvals" className="mt-4">
            <ApprovalsTab eventId={event.id} currency={event.currency || 'EUR'} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
