import { useState } from 'react';
import { format } from 'date-fns';
import { Users, Phone, Mail, Calendar, UserPlus, CheckCircle2, Circle, Copy, Search, FileText, Hash, UsersRound } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { AddAttendeeModal } from './AddAttendeeModal';
import { AttendeeDetailModal } from './AttendeeDetailModal';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';
import { toast } from 'sonner';

export interface InvoiceAttendee {
  attendee_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  event_id: string | null;
  payment_status: string | null;
  registration_status: string | null;
  checked_in: boolean | null;
  ticket_tier_id: string | null;
  registered_at: string | null;
  order_id: string | null;
  order_number: number | null;
  bc_invoice_number: string | null;
  bc_invoice_id: string | null;
  bc_customer_no: string | null;
  order_status: string | null;
  payment_method: string | null;
  payer_type: string | null;
  payer_name: string | null;
  total_amount: number | null;
  is_group_order: boolean | null;
}

interface EventAttendeesTableProps {
  attendees: InvoiceAttendee[];
  isLoading: boolean;
  eventId: string;
  currency?: string;
}

type PaymentFilter = 'all' | 'paid' | 'pending' | 'overdue';

export function EventAttendeesTable({ attendees, isLoading, eventId, currency = 'EUR' }: EventAttendeesTableProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<InvoiceAttendee | null>(null);
  const { t } = useAdminLanguage();

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
      case 'approved': return t('attendeeTable.registered');
      case 'pending': return t('attendeeTable.pending');
      case 'cancelled': return t('attendeeTable.cancelled');
      default: return t('attendeeTable.pending');
    }
  };

  const getPaymentBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15">{t('attendeeTable.paid')}</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15">{t('attendeeTable.pending')}</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15">{t('attendeeTable.overdue')}</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus || 'N/A'}</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('attendeeTable.copied'));
  };

  const getFullName = (attendee: InvoiceAttendee) =>
    `${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || '—';

  // Apply filters
  let filteredAttendees = paymentFilter === 'all'
    ? attendees
    : attendees.filter(a => a.payment_status === paymentFilter);

  if (invoiceSearch.trim()) {
    const q = invoiceSearch.trim().toLowerCase();
    filteredAttendees = filteredAttendees.filter(a =>
      a.bc_invoice_number?.toLowerCase().includes(q)
    );
  }

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
                {t('attendeeTable.title')}
              </CardTitle>
              <CardDescription>{t('attendeeTable.subtitle')}</CardDescription>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('attendeeTable.addAttendee')}
            </Button>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('attendeeTable.noRegistrations')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('attendeeTable.noRegistrationsDesc')}
            </p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('attendeeTable.addFirst')}
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
              {t('attendeeTable.title')} ({attendees.length})
            </CardTitle>
            <CardDescription>{t('attendeeTable.subtitle')}</CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('attendeeTable.addAttendee')}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              {(['all', 'paid', 'pending', 'overdue'] as PaymentFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={paymentFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentFilter(filter)}
                >
                  {filter === 'all' ? t('attendeeTable.all') : t(`attendeeTable.${filter}` as any)}
                  <span className="ml-1.5 text-xs opacity-70">({filterCounts[filter]})</span>
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('attendeeTable.searchInvoice')}
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('attendeeTable.fullName')}</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {t('attendeeTable.email')}
                  </div>
                </TableHead>
                <TableHead>{t('attendeeTable.payment')}</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {t('attendeeTable.invoiceNumber')}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-4 w-4" />
                    {t('attendeeTable.orderNumber')}
                  </div>
                </TableHead>
                <TableHead>{t('attendeeTable.checkin')}</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {t('attendeeTable.registrationDate')}
                  </div>
                </TableHead>
                <TableHead>{t('attendeeTable.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.map((attendee) => (
                <TableRow
                  key={attendee.attendee_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAttendee(attendee)}
                >
                  <TableCell className="font-medium">{getFullName(attendee)}</TableCell>
                  <TableCell>
                    {attendee.email || <span className="text-muted-foreground italic">{t('attendeeTable.noEmail')}</span>}
                  </TableCell>
                  <TableCell>{getPaymentBadge(attendee.payment_status)}</TableCell>
                  <TableCell>
                    {attendee.bc_invoice_number ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(attendee.bc_invoice_number!);
                        }}
                        className="inline-flex items-center gap-1 font-mono text-sm hover:text-primary transition-colors"
                        title={t('attendeeTable.clickToCopy')}
                      >
                        {attendee.bc_invoice_number}
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {attendee.order_number != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm">#{attendee.order_number}</span>
                        {attendee.is_group_order && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-4 border-blue-500/30 text-blue-600">
                            <UsersRound className="h-3 w-3 mr-0.5" />
                            {t('attendeeTable.group')}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {attendee.checked_in ? (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">{t('attendeeTable.checkedIn')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Circle className="h-4 w-4" />
                        <span className="text-sm">{t('attendeeTable.notCheckedIn')}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {attendee.registered_at
                      ? format(new Date(attendee.registered_at), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(attendee.registration_status)}>
                      {getStatusLabel(attendee.registration_status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddAttendeeModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} eventId={eventId} />
      <AttendeeDetailModal
        open={!!selectedAttendee}
        onOpenChange={(open) => !open && setSelectedAttendee(null)}
        attendee={selectedAttendee}
        currency={currency}
      />
    </>
  );
}
