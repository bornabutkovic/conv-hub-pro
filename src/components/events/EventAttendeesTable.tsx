import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Pencil, UserPlus, Download } from 'lucide-react';
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
  payer_type: string | null;
  payer_name: string | null;
  total_amount: number | null;
  is_group_order: boolean | null;
  paid_at: string | null;
  payment_due_days: number | null;
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

function getPaymentMethodLabel(method: string | null) {
  if (method === 'stripe') return 'Kreditna kartica';
  if (method === 'invoice') return 'Bankovna transakcija';
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

function EditAttendeeModal({ attendee, open, onOpenChange, eventId }: EditModalProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: attendee.first_name || '',
    last_name: attendee.last_name || '',
    paid_at: attendee.paid_at ? attendee.paid_at.slice(0, 10) : '',
    fiscal_invoice_number: attendee.fiscal_invoice_number || '',
    payment_method: attendee.payment_method || '',
    payment_status: attendee.payment_status || 'pending',
  });

  const handleSave = async () => {
    if (!attendee.attendee_id) return;
    setIsSaving(true);
    try {
      // Update attendees table
      const { error: attError } = await supabase
        .from('attendees')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          payment_status: form.payment_status,
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
              value={form.payment_status}
              onValueChange={v => setForm(f => ({ ...f, payment_status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Nije plaćeno</SelectItem>
                <SelectItem value="paid">Plaćeno</SelectItem>
                <SelectItem value="overdue">Kasni</SelectItem>
                <SelectItem value="refunded">Refundirano</SelectItem>
                <SelectItem value="cancelled">Otkazano</SelectItem>
              </SelectContent>
            </Select>
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
  const [isExporting, setIsExporting] = useState(false);
  const { t } = useAdminLanguage();

  const filtered = attendees.filter(a => {
    if (paymentFilter === 'all') return true;
    return a.payment_status === paymentFilter;
  });

  const handleExportCsv = async () => {
    if (!attendees.length) return;
    setIsExporting(true);
    try {
      const headers = [
        'Narudžba #',
        'Ime i prezime',
        'Email',
        'Datum registracije',
        'Rok plaćanja',
        'Broj ponude',
        'Datum plaćanja',
        'Broj računa',
        'Način plaćanja',
        'Status plaćanja',
        'Check-in',
      ];

      const rows = attendees.map(a => {
        const deadline = a.registered_at && a.payment_due_days != null
          ? format(addDays(new Date(a.registered_at), a.payment_due_days), 'dd MMM yyyy')
          : '—';
        return [
          a.order_number ? `#${a.order_number}` : '—',
          `${a.first_name || ''} ${a.last_name || ''}`.trim(),
          a.email || '—',
          formatDate(a.registered_at),
          deadline,
          a.bc_quote_number || '—',
          formatDate(a.paid_at),
          a.fiscal_invoice_number || '—',
          getPaymentMethodLabel(a.payment_method),
          a.payment_status || '—',
          a.checked_in ? 'Prijavljen' : 'Nije prijavljen',
        ];
      });

      const csvContent = '\uFEFF' + [headers, ...rows]
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>Polaznici / Attendees ({attendees.length})</span>
              </CardTitle>
              <CardDescription>Upravljajte registracijama / Manage event registrations</CardDescription>
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
                Dodaj polaznika / Add Attendee
              </Button>
            </div>
          </div>

          {/* Payment status filter */}
          <div className="mt-3">
            <Select
              value={paymentFilter}
              onValueChange={v => setPaymentFilter(v as PaymentStatusFilter)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi / All ({attendees.length})</SelectItem>
                <SelectItem value="paid">Plaćeno / Paid ({attendees.filter(a => a.payment_status === 'paid').length})</SelectItem>
                <SelectItem value="pending">Nije plaćeno / Unpaid ({attendees.filter(a => a.payment_status === 'pending').length})</SelectItem>
                <SelectItem value="overdue">Kasni / Overdue ({attendees.filter(a => a.payment_status === 'overdue').length})</SelectItem>
                <SelectItem value="refunded">Refundirano / Refunded ({attendees.filter(a => a.payment_status === 'refunded').length})</SelectItem>
                <SelectItem value="cancelled">Otkazano / Cancelled ({attendees.filter(a => a.payment_status === 'cancelled').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Učitavanje... / Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nema polaznika / No attendees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-20">Narudžba # / Order #</TableHead>
                    <TableHead>Ime i prezime / Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="whitespace-nowrap">Datum reg. / Reg. Date</TableHead>
                    <TableHead className="whitespace-nowrap">Rok plaćanja / Deadline</TableHead>
                    <TableHead className="whitespace-nowrap">Broj ponude / Proforma #</TableHead>
                    <TableHead className="whitespace-nowrap">Datum uplate / Payment Date</TableHead>
                    <TableHead className="whitespace-nowrap">Broj računa / Invoice #</TableHead>
                    <TableHead className="whitespace-nowrap">Način plaćanja / Method</TableHead>
                    <TableHead className="whitespace-nowrap">Status plaćanja / Payment</TableHead>
                    <TableHead className="whitespace-nowrap">Check-in</TableHead>
                    <TableHead className="w-10"></TableHead>
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
                        className="cursor-pointer hover:bg-muted/40 text-sm"
                        onClick={() => setSelectedAttendee(attendee)}
                      >
                        <TableCell className="font-mono text-sm">
                          {attendee.order_number ? `#${attendee.order_number}` : '—'}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {`${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[180px] truncate">
                          {attendee.email || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(attendee.registered_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {deadline}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {attendee.bc_quote_number || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(attendee.paid_at)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {attendee.fiscal_invoice_number || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {getPaymentMethodLabel(attendee.payment_method)}
                        </TableCell>
                        <TableCell>
                          {getPaymentBadge(attendee.payment_status)}
                        </TableCell>
                        <TableCell>
                          {getCheckinBadge(attendee.checked_in)}
                        </TableCell>
                        <TableCell
                          onClick={e => { e.stopPropagation(); setEditAttendee(attendee); }}
                          className="text-right"
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
          attendee={{ ...selectedAttendee, bc_invoice_number: selectedAttendee.bc_quote_number || selectedAttendee.fiscal_invoice_number }}
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
