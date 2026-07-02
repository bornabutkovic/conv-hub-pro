import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Pencil, UserPlus, Download, Send, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AddAttendeeModal } from './AddAttendeeModal';
import { AttendeeDetailModal } from './AttendeeDetailModal';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  bc_quote_number: string | null;
  bc_invoice_id: string | null;
  bc_customer_no: string | null;
  fiscal_invoice_number: string | null;
  order_status: string | null;
  payment_method: string | null;
  card_brand: string | null;
  card_wallet: string | null;
  payer_type: string | null;
  payer_name: string | null;
  total_amount: number | null;
  is_group_order: boolean | null;
  paid_at: string | null;
  payment_due_days: number | null;
  price_paid: number | null;
}

interface EventAttendeesTableProps {
  attendees: InvoiceAttendee[];
  isLoading: boolean;
  eventId: string;
  currency?: string;
  eventName?: string;
}

type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'refunded' | 'cancelled';

function getPaymentBadge(status: string | null) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15">Plaćeno</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15">Nije plaćeno</Badge>;
    case 'overdue':
      return <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15">Kasni</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 hover:bg-purple-500/15">Refundirano</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Otkazano</Badge>;
    default:
      return <span className="text-muted-foreground text-xs">—</span>;
  }
}

function getCheckinBadge(checkedIn: boolean | null) {
  if (checkedIn) {
    return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">Prijavljen</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Nije prijavljen</Badge>;
}

function getPaymentMethodLabel(
  method: string | null,
  cardBrand: string | null,
  cardWallet: string | null
) {
  if (method === 'stripe') {
    if (cardWallet === 'link') return 'Stripe Link';
    if (cardWallet === 'apple_pay') return 'Apple Pay';
    if (cardWallet === 'google_pay') return 'Google Pay';
    const brandMap: Record<string, string> = {
      visa:       'Visa',
      mastercard: 'Mastercard',
      amex:       'Amex',
      diners:     'Diners',
      maestro:    'Maestro',
    };
    const brand = cardBrand ? (brandMap[cardBrand.toLowerCase()] ?? cardBrand) : null;
    return brand ? `Card (${brand})` : 'Credit card';
  }
  if (method === 'invoice') return 'Bank transfer';
  return '—';
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; }
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  attendee: InvoiceAttendee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

interface TicketStatus {
  ticket_sent_at: string | null;
  ticket_send_failed_at: string | null;
  ticket_send_fail_reason: string | null;
}

function EditAttendeeModal({ attendee, open, onOpenChange, eventId }: EditModalProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | null>(null);
  const [form, setForm] = useState({
    first_name: attendee.first_name || '',
    last_name: attendee.last_name || '',
    paid_at: attendee.paid_at ? attendee.paid_at.slice(0, 10) : '',
    fiscal_invoice_number: attendee.fiscal_invoice_number || '',
    payment_method: attendee.payment_method || '',
    order_status: (attendee.order_status as string) || 'draft',
  });

  const fetchTicketStatus = async () => {
    if (!attendee.attendee_id) return;
    const { data } = await supabase
      .from('attendees')
      .select('ticket_sent_at, ticket_send_failed_at, ticket_send_fail_reason')
      .eq('id', attendee.attendee_id)
      .maybeSingle();
    if (data) setTicketStatus(data as TicketStatus);
  };

  useEffect(() => {
    if (!open) return;

    // Refresh current order status so the dropdown reflects DB truth (avoids stale enum)
    (async () => {
      if (attendee.order_id) {
        const { data } = await supabase
          .from('orders')
          .select('status')
          .eq('id', attendee.order_id)
          .maybeSingle();
        setForm(f => ({ ...f, order_status: (data?.status as string) || 'draft' }));
      }
    })();

    fetchTicketStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attendee.attendee_id, attendee.order_id]);

  const handleSave = async () => {
    if (!attendee.attendee_id) return;
    setIsSaving(true);
    try {
      // Update attendees table (name fields only — payment_status is synced from orders by a DB trigger)
      const { error: attError } = await supabase
        .from('attendees')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
        })
        .eq('id', attendee.attendee_id);

      if (attError) throw attError;

      // Update orders table if order exists
      if (attendee.order_id) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : null,
            fiscal_invoice_number: form.fiscal_invoice_number || null,
            payment_method: form.payment_method || null,
            status: form.order_status as 'cancelled' | 'draft' | 'issued' | 'overdue' | 'paid' | 'refunded',
          })
          .eq('id', attendee.order_id);

        if (orderError) throw orderError;
      }


      toast.success('Promjene su spremljene');
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Greška pri spremanju');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendTicket = async () => {
    if (!attendee.attendee_id) return;
    setIsResending(true);
    try {
      const { data, error } = await supabase.rpc('admin_resend_ticket' as any, {
        p_attendee_id: attendee.attendee_id,
      });
      const result = data as { success?: boolean; email?: string } | null;
      if (error || !result?.success) {
        toast.error('Slanje nije uspjelo: ' + (error?.message ?? 'nepoznata greška'));
      } else {
        toast.success('Ulaznica se šalje na ' + (result.email ?? 'email polaznika'));
        setTimeout(() => { fetchTicketStatus(); }, 3000);
      }
    } catch (err: any) {
      toast.error('Slanje nije uspjelo: ' + (err?.message ?? 'nepoznata greška'));
    } finally {
      setIsResending(false);
    }
  };

  const ticketSentAt = ticketStatus?.ticket_sent_at ?? null;
  const ticketFailedAt = ticketStatus?.ticket_send_failed_at ?? null;
  const ticketFailReason = ticketStatus?.ticket_send_fail_reason ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Uredi polaznika</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ime</Label>
              <Input
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prezime</Label>
              <Input
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Datum plaćanja</Label>
            <Input
              type="date"
              value={form.paid_at}
              onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Broj računa</Label>
            <Input
              placeholder="npr. 2026-01-0001"
              value={form.fiscal_invoice_number}
              onChange={e => setForm(f => ({ ...f, fiscal_invoice_number: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Način plaćanja</Label>
            <Select
              value={form.payment_method}
              onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaberi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Kreditna kartica</SelectItem>
                <SelectItem value="invoice">Bankovna transakcija</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status plaćanja</Label>
            <Select
              value={form.order_status}
              onValueChange={v => setForm(f => ({ ...f, order_status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Skica</SelectItem>
                <SelectItem value="issued">Izdano (čeka uplatu)</SelectItem>
                <SelectItem value="paid">Plaćeno</SelectItem>
                <SelectItem value="overdue">Kasni</SelectItem>
                <SelectItem value="refunded">Refundirano</SelectItem>
                <SelectItem value="cancelled">Otkazano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ticket status + resend */}
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm">
              {ticketSentAt ? (
                <span className="text-emerald-600">
                  Ulaznica poslana {(() => {
                    try { return format(new Date(ticketSentAt), 'dd.MM.yyyy. HH:mm'); }
                    catch { return ticketSentAt; }
                  })()}
                </span>
              ) : ticketFailedAt ? (
                <div>
                  <div className="text-red-600">Slanje nije uspjelo</div>
                  {ticketFailReason && (
                    <div className="text-xs text-muted-foreground mt-0.5">{ticketFailReason}</div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Ulaznica nije poslana</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResendTicket}
              disabled={isResending || !attendee.attendee_id}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Slanje...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  {ticketSentAt ? 'Ponovno pošalji ulaznicu' : 'Pošalji ulaznicu'}
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Odustani
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Spremanje...' : 'Spremi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EventAttendeesTable({
  attendees,
  isLoading,
  eventId,
  currency = 'EUR',
  eventName,
}: EventAttendeesTableProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<InvoiceAttendee | null>(null);
  const [editAttendee, setEditAttendee] = useState<InvoiceAttendee | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'stripe' | 'invoice'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useAdminLanguage();

  const formatAmount = (n: number | null | undefined) =>
    n == null ? '—' : `${n.toFixed(2).replace('.', ',')} ${currency}`;

  const filtered = attendees.filter(a => {
    if (paymentFilter !== 'all' && a.payment_status !== paymentFilter) return false;
    if (methodFilter !== 'all' && a.payment_method !== methodFilter) return false;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const fullName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const email = (a.email || '').toLowerCase();
      const payer = (a.payer_name || '').toLowerCase();
      if (!fullName.includes(term) && !email.includes(term) && !payer.includes(term)) return false;
    }
    return true;
  });

  const filteredPaidSum = filtered.reduce(
    (acc, a) => acc + (a.payment_status === 'paid' ? Number(a.price_paid ?? 0) : 0),
    0,
  );

  const handleExportCsv = async () => {
    if (!filtered.length) return;
    setIsExporting(true);
    try {
      const headers = [
        'Narudžba #',
        'Ime i prezime',
        'Email',
        'Tvrtka/Organizacija',
        'Datum registracije',
        'Rok plaćanja',
        'Broj ponude',
        'Datum plaćanja',
        'Broj računa',
        'Iznos',
        'Način plaćanja',
        'Status plaćanja',
        'Check-in',
      ];

      const rows = filtered.map(a => {
        const deadline = a.registered_at && a.payment_due_days != null
          ? format(addDays(new Date(a.registered_at), a.payment_due_days), 'dd MMM yyyy')
          : '—';
        return [
          a.order_number ? `#${a.order_number}` : '—',
          `${a.first_name || ''} ${a.last_name || ''}`.trim(),
          a.email || '—',
          a.payer_type === 'company' ? (a.payer_name || '—') : '—',
          formatDate(a.registered_at),
          deadline,
          a.bc_quote_number || '—',
          formatDate(a.paid_at),
          a.fiscal_invoice_number || '—',
          a.price_paid != null ? Number(a.price_paid).toFixed(2) : '',
          getPaymentMethodLabel(a.payment_method, a.card_brand, a.card_wallet),
          a.payment_status || '—',
          a.checked_in ? 'Prijavljen' : 'Nije prijavljen',
        ];
      });

      const emptyRow = headers.map(() => '');
      const totalRow = [
        'UKUPNO UPLAĆENO', '', '', '', '', '', '', '', '',
        filteredPaidSum.toFixed(2),
        '', '', '',
      ];

      const csvContent = '\uFEFF' + [headers, ...rows, emptyRow, totalRow]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `polaznici-${eventName || eventId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV izvezen');
    } catch (err) {
      toast.error('Greška pri izvozu');
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <>
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>Polaznici ({attendees.length})</span>
              </CardTitle>
              <CardDescription>Upravljajte registracijama</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isExporting || !attendees.length}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Dodaj polaznika
              </Button>
            </div>
          </div>

          {/* Payment status filter */}
          <div className="mt-3">
            <Select
              value={paymentFilter}
              onValueChange={v => setPaymentFilter(v as PaymentStatusFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi ({attendees.length})</SelectItem>
                <SelectItem value="paid">Plaćeno ({attendees.filter(a => a.payment_status === 'paid').length})</SelectItem>
                <SelectItem value="pending">Nije plaćeno ({attendees.filter(a => a.payment_status === 'pending').length})</SelectItem>
                <SelectItem value="overdue">Kasni ({attendees.filter(a => a.payment_status === 'overdue').length})</SelectItem>
                <SelectItem value="refunded">Refundirano ({attendees.filter(a => a.payment_status === 'refunded').length})</SelectItem>
                <SelectItem value="cancelled">Otkazano ({attendees.filter(a => a.payment_status === 'cancelled').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Učitavanje...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nema polaznika
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">Narudžba #</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Ime i prezime</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tvrtka/Org.</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Datum reg.</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Rok plaćanja</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Br. ponude</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Datum uplate</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Br. računa</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Plaćanje</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</TableHead>
                    <TableHead className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Check-in</TableHead>
                    <TableHead className="py-2 px-3 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(attendee => {
                    const deadline = attendee.registered_at && attendee.payment_due_days != null
                      ? format(addDays(new Date(attendee.registered_at), attendee.payment_due_days), 'dd MMM yyyy')
                      : '—';

                    return (
                      <TableRow
                        key={attendee.attendee_id}
                        className="h-10 cursor-pointer hover:bg-muted/40 text-xs"
                        onClick={() => setSelectedAttendee(attendee)}
                      >
                        <TableCell className="py-2 px-3 text-xs font-mono">
                          {attendee.order_number ? `#${attendee.order_number}` : '—'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs font-medium whitespace-nowrap">
                          {`${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || '—'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                          {attendee.email || '—'}
                        </TableCell>
                        <TableCell
                          className="py-2 px-3 text-sm text-muted-foreground max-w-[140px] truncate"
                          title={attendee.payer_type === 'company' ? (attendee.payer_name || '') : ''}
                        >
                          {attendee.payer_type === 'company' ? (attendee.payer_name || '—') : '—'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs whitespace-nowrap">
                          {formatDate(attendee.registered_at)}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs whitespace-nowrap">
                          {deadline}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs font-mono">
                          {attendee.bc_quote_number || '—'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs whitespace-nowrap">
                          {formatDate(attendee.paid_at)}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs font-mono">
                          {attendee.fiscal_invoice_number || '—'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs whitespace-nowrap">
                          {getPaymentMethodLabel(attendee.payment_method, attendee.card_brand, attendee.card_wallet)}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs">
                          {getPaymentBadge(attendee.payment_status)}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-xs">
                          {getCheckinBadge(attendee.checked_in)}
                        </TableCell>
                        <TableCell
                          onClick={e => { e.stopPropagation(); setEditAttendee(attendee); }}
                          className="py-2 px-3 text-right"
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAttendeeModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        eventId={eventId}
      />

      {selectedAttendee && (
        <AttendeeDetailModal
          open={!!selectedAttendee}
          onOpenChange={open => { if (!open) setSelectedAttendee(null); }}
          attendee={selectedAttendee}
          currency={currency}
        />
      )}

      {editAttendee && (
        <EditAttendeeModal
          open={!!editAttendee}
          onOpenChange={open => { if (!open) setEditAttendee(null); }}
          attendee={editAttendee}
          eventId={eventId}
        />
      )}
    </>
  );
}
