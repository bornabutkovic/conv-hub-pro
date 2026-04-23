import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Tag, Users, DollarSign, Edit, Send, CheckCircle, ShieldCheck, Eye } from 'lucide-react';
import { isSuperAdmin } from '@/lib/roles';
import { ArchiveEventDialog } from '@/components/events/ArchiveEventDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EventAttendeesTable } from '@/components/events/EventAttendeesTable';
import { EventServicesTable } from '@/components/events/EventServicesTable';
import { TicketTiersTable } from '@/components/events/TicketTiersTable';
import { ApprovalsTab } from '@/components/events/ApprovalsTab';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { usePendingApprovalItems } from '@/hooks/useAdminNotifications';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';
import { toast } from 'sonner';

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'attendees';
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);
  const userIsSuperAdmin = isSuperAdmin(profile?.role);
  const { t } = useAdminLanguage();

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
      case 'active': return t('status.active');
      case 'pending_approval': return t('status.pendingApproval');
      case 'completed': return t('status.completed');
      case 'draft': return t('status.draft');
      default: return t('status.draft');
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
        <p className="text-muted-foreground">{t('eventDetails.eventNotFound')}</p>
        <Button variant="link" onClick={() => navigate('/events')}>
          {t('eventDetails.backToEvents')}
        </Button>
      </div>
    );
  }

  const totalAttendees = attendees?.length || 0;
  const paidAttendees = (attendees || []).filter(a => a.payment_status === 'paid');
  const pendingAttendees = (attendees || []).filter(a => a.payment_status === 'pending');
  const totalRevenue = paidAttendees.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);
  const pendingRevenue = pendingAttendees.reduce((sum, a) => sum + Number(a.total_amount || 0), 0);

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
        {t('eventDetails.backToEvents')}
      </Button>

      {/* Rejection Alert */}
      {event.status === 'rejected' && (event as any).rejection_reason && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-destructive">{t('eventDetails.actionRequired')}</p>
              <p className="text-sm text-destructive/90 mt-1">{(event as any).rejection_reason}</p>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-2 flex-wrap">
          {userIsAdmin && (
            <div className="flex items-center gap-2">
              <Label htmlFor="event-status" className="text-sm text-muted-foreground whitespace-nowrap">
                {t('eventDetails.status')}:
              </Label>
              <Select
                value={event.status || 'draft'}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger id="event-status" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="pending_approval">{t('status.pendingApproval')}</SelectItem>
                  <SelectItem value="active">{t('status.active')}</SelectItem>
                  <SelectItem value="test">{t('status.test')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                  {userIsSuperAdmin && <SelectItem value="archived">{t('status.archived')}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}
          {!userIsAdmin && event.status === 'draft' && (
            <Button 
              variant="outline" 
              onClick={() => handleStatusChange('pending_approval')}
              disabled={isUpdatingStatus}
            >
              <Send className="h-4 w-4 mr-2" />
              {t('eventDetails.submitForReview')}
            </Button>
          )}
          {userIsAdmin && event.status === 'pending_approval' && (
            <Button 
              onClick={() => handleStatusChange('active')}
              disabled={isUpdatingStatus}
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('eventDetails.approve')}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.open(`https://conwayo.io/preview/${event.id}`, '_blank', 'noopener,noreferrer')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('eventDetails.preview')}
          </Button>
          <Button onClick={() => navigate(`/events/${event.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('eventDetails.edit')}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('eventDetails.totalRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-emerald-600">
                ✅ {t('eventDetails.paid')}: {paidAttendees.length} {t('eventDetails.registrations')} — {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-amber-600">
                ⏳ {t('eventDetails.pending')}: {pendingAttendees.length} {t('eventDetails.registrations')} — {formatCurrency(pendingRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('eventDetails.totalAttendees')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttendees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('eventDetails.registeredFor')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Attendees, Tickets, Services & Approvals */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="attendees">{t('eventDetails.attendees')}</TabsTrigger>
          <TabsTrigger value="ticket-tiers">{t('eventDetails.ticketTiers')}</TabsTrigger>
          <TabsTrigger value="services">{t('eventDetails.services')}</TabsTrigger>
          {userIsAdmin && (
            <TabsTrigger value="approvals" className="relative">
              <ShieldCheck className="h-4 w-4 mr-1" />
              {t('eventDetails.approvals')}
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
            currency={event.currency || 'EUR'}
            eventName={event.name}
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

      {/* Archive button – super_admin only */}
      {userIsSuperAdmin && event.status !== 'archived' && (
        <div className="border-t pt-6 mt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('eventDetails.dangerZone')}</p>
              <p className="text-xs text-muted-foreground">{t('eventDetails.archiveDescription')}</p>
            </div>
            <ArchiveEventDialog
              eventId={event.id}
              eventName={event.name}
              paidAttendeesCount={paidAttendees.length}
            />
          </div>
        </div>
      )}
    </div>
  );
}
