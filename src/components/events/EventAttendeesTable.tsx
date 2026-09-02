import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Pencil, UserPlus, Users, Download, Send, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Textarea } from '@/components/ui/textarea';
import { AddAttendeeModal } from './AddAttendeeModal';
import { GroupRegistrationModal } from './GroupRegistrationModal';
import { COUNTRIES, getCountryName } from '@/lib/countries';
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
  phone: string | null;
  institution: string | null;
  oib: string | null;
  specialty: string | null;
  requires_invoice: boolean | null;

}

interface EventAttendeesTableProps {
  attendees: InvoiceAttendee[];
  isLoading: boolean;
  eventId: string;
  currency?: string;
  eventName?: string;
}

type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'refunded' | 'cancelled' | 'deferred';

type SortKey =
  | 'order_number'
  | 'name'
  | 'email'
  | 'company'
  | 'registered_at'
  | 'deadline'
  | 'quote_number'
  | 'paid_at'
  | 'invoice_number'
  | 'amount'
  | 'payment_method'
  | 'payment_status'
  | 'checked_in';

function getPaymentBadge(status: string | null) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15 text-sm">Plaćeno</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15 text-sm">Nije plaćeno</Badge>;
    case 'deferred':
      return <Badge className="bg-indigo-500/15 text-indigo-700 border-indigo-500/20 hover:bg-indigo-500/15 text-sm">Plaćanje po ugovoru</Badge>;
    case 'overdue':
      return <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15 text-sm">Kasni</Badge>;
    case 'refunded':
      return <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 hover:bg-purple-500/15 text-sm">Refundirano</Badge>;
    case 'cancelled':
      return <Badge variant="secondary" className="text-sm">Otkazano</Badge>;
    default:
      return <span className="text-muted-foreground text-sm">—</span>;
  }
}

function getCheckinBadge(checkedIn: boolean | null) {
  if (checkedIn) {
    return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 text-sm">Prijavljen</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground text-sm">Nije prijavljen</Badge>;
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

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd.MM.yyyy.'); } catch { return '—'; }
}

function getDeadlineDate(a: Pick<InvoiceAttendee, 'registered_at' | 'payment_due_days'>): Date | null {
  if (!a.registered_at || a.payment_due_days == null) return null;
  return addDays(new Date(a.registered_at), a.payment_due_days);
}

function csvText(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function csvNumber(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toFixed(2).replace('.', ',');
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
  const [originalOrderStatus, setOriginalOrderStatus] = useState<string>(attendee.order_status || 'draft');
  const [form, setForm] = useState({
    first_name: attendee.first_name || '',
    last_name: attendee.last_name || '',
    email: attendee.email || '',
    phone: attendee.phone || '',
    oib: attendee.oib || '',
    institution: attendee.institution || '',
    specialty: attendee.specialty || '',
    requires_invoice: attendee.requires_invoice === true,
    paid_at: attendee.paid_at ? attendee.paid_at.slice(0, 10) : '',
    fiscal_invoice_number: attendee.fiscal_invoice_number || '',
    payment_method: attendee.payment_method || '',
    order_status: (attendee.order_status as string) || 'draft',
    payer_type: 'individual',
    payer_name: '',
    payer_oib: '',
    payer_address: '',
    payer_city: '',
    payer_postal_code: '',
    payer_country_code: 'HR',
    payer_country_name: 'Croatia',
    billing_email: '',
    po_number: '',
    lang: 'hr',
  });

  const emptyOrderSnapshot = {
    paid_at: attendee.paid_at ? attendee.paid_at.slice(0, 10) : '',
    fiscal_invoice_number: attendee.fiscal_invoice_number || '',
    payment_method: attendee.payment_method || '',
    order_status: (attendee.order_status as string) || 'draft',
    payer_type: 'individual',
    payer_name: '',
    payer_oib: '',
    payer_address: '',
    payer_city: '',
    payer_postal_code: '',
    payer_country_code: 'HR',
    payer_country_name: 'Croatia',
    billing_email: '',
    po_number: '',
    lang: 'hr',
  };

  const [orderSnapshot, setOrderSnapshot] = useState(emptyOrderSnapshot);
  const [groupChangeConfirmed, setGroupChangeConfirmed] = useState(false);

  const ORDER_FIELD_KEYS = [
    'paid_at', 'fiscal_invoice_number', 'payment_method', 'order_status',
    'payer_type', 'payer_name', 'payer_oib', 'payer_address', 'payer_city',
    'payer_postal_code', 'payer_country_code', 'payer_country_name',
    'billing_email', 'po_number', 'lang',
  ] as const;

  const orderFieldsChanged = ORDER_FIELD_KEYS.some(
    k => (form as Record<string, unknown>)[k] !== (orderSnapshot as Record<string, unknown>)[k]
  );

  const needsGroupConfirm = attendee.is_group_order === true && orderFieldsChanged;

  const [refundsList, setRefundsList] = useState<{
    id: string;
    amount: number | null;
    reason: string | null;
    credit_note_number: string | null;
    credit_note_issued_at: string | null;
    created_at: string | null;
  }[]>([]);
  const [creditNoteDrafts, setCreditNoteDrafts] = useState<Record<string, string>>({});
  const [savingCreditNoteId, setSavingCreditNoteId] = useState<string | null>(null);

  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundItems, setRefundItems] = useState<{
    id: string;
    attendee_id: string | null;
    first_name: string | null;
    last_name: string | null;
    total_price: number | null;
  }[]>([]);
  const [selectedRefundItemIds, setSelectedRefundItemIds] = useState<string[]>([]);
  const [refundReason, setRefundReason] = useState('');
  const [refundStripeId, setRefundStripeId] = useState('');
  const [refundCreditNoteNumber, setRefundCreditNoteNumber] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const fetchRefunds = async () => {
    if (!attendee.attendee_id) return;
    const { data } = await supabase
      .from('refunds')
      .select('id, amount, reason, credit_note_number, credit_note_issued_at, created_at')
      .eq('attendee_id', attendee.attendee_id)
      .order('created_at', { ascending: false });
    const rows = (data || []) as any[];
    setRefundsList(rows);
    setCreditNoteDrafts(
      Object.fromEntries(rows.map(r => [r.id, r.credit_note_number || '']))
    );
  };

  const handleSaveCreditNote = async (refundId: string) => {
    setSavingCreditNoteId(refundId);
    try {
      const { error } = await supabase.rpc('set_refund_credit_note' as any, {
        p_refund_id: refundId,
        p_credit_note_number: creditNoteDrafts[refundId] || null,
      });
      if (error) throw error;
      toast.success('Broj odobrenja spremljen');
      await fetchRefunds();
    } catch (err: any) {
      toast.error('Spremanje nije uspjelo: ' + (err?.message ?? 'nepoznata greška'));
    } finally {
      setSavingCreditNoteId(null);
    }
  };


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

    setGroupChangeConfirmed(false);
    setOrderSnapshot(emptyOrderSnapshot);

    (async () => {
      if (attendee.order_id) {
        const { data } = await supabase
          .from('orders')
          .select('status, payer_type, payer_name, payer_oib, payer_address, payer_city, payer_postal_code, payer_country_code, payer_country_name, billing_email, po_number, lang')
          .eq('id', attendee.order_id)
          .maybeSingle();
        const o = (data || {}) as Record<string, any>;
        const st = (o.status as string) || 'draft';
        const patch = {
          order_status: st,
          payer_type: (o.payer_type as string) || 'individual',
          payer_name: o.payer_name || '',
          payer_oib: o.payer_oib || '',
          payer_address: o.payer_address || '',
          payer_city: o.payer_city || '',
          payer_postal_code: o.payer_postal_code || '',
          payer_country_code: o.payer_country_code || 'HR',
          payer_country_name: o.payer_country_name || 'Croatia',
          billing_email: o.billing_email || '',
          po_number: o.po_number || '',
          lang: (o.lang as string) || 'hr',
        };
        setForm(f => ({ ...f, ...patch }));
        setOrderSnapshot(s => ({ ...s, ...patch }));
        setOriginalOrderStatus(st);
      }
    })();

    fetchTicketStatus();
    fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attendee.attendee_id, attendee.order_id]);


  const handleOrderStatusChange = async (v: string) => {
    if (v === 'refunded' && originalOrderStatus !== 'refunded') {
      if (!attendee.order_id) return;
      const { data, error } = await supabase
        .from('order_items')
        .select('id, attendee_id, total_price, attendees(first_name, last_name)')
        .eq('order_id', attendee.order_id);

      if (error) {
        toast.error('Greška pri dohvaćanju stavki narudžbe: ' + error.message);
        return;
      }

      const items = (data || []).map((r: any) => ({
        id: r.id,
        attendee_id: r.attendee_id,
        first_name: r.attendees?.first_name ?? null,
        last_name: r.attendees?.last_name ?? null,
        total_price: Number(r.total_price) || 0,
      }));

      setRefundItems(items);
      const defaultSelected = items.filter(i => i.attendee_id === attendee.attendee_id).map(i => i.id);
      setSelectedRefundItemIds(defaultSelected.length ? defaultSelected : items.map(i => i.id));
      setRefundReason('');
      setRefundStripeId('');
      setRefundCreditNoteNumber('');

      setRefundDialogOpen(true);
      return;
    }
    setForm(f => ({ ...f, order_status: v }));
  };

  const toggleRefundItem = (id: string) => {
    setSelectedRefundItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllRefundItems = () => setSelectedRefundItemIds(refundItems.map(i => i.id));

  const handleConfirmRefund = async () => {
    if (!attendee.order_id || selectedRefundItemIds.length === 0) {
      toast.error('Odaberi barem jednu stavku za refund');
      return;
    }
    setIsProcessingRefund(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('process_order_refund', {
        p_order_id: attendee.order_id,
        p_order_item_ids: selectedRefundItemIds,
        p_reason: refundReason || null,
        p_stripe_refund_id: refundStripeId || null,
        p_refunded_by: userData?.user?.email || null,
        p_credit_note_number: refundCreditNoteNumber || null,
      } as any);

      if (error) throw error;

      const result = data as { order_fully_refunded?: boolean; refunded_attendee_ids?: string[] } | null;
      toast.success(
        result?.order_fully_refunded
          ? 'Cijela narudžba je refundirana.'
          : `Refundirano ${result?.refunded_attendee_ids?.length ?? 0} stavki/sudionika u ovoj narudžbi.`
      );

      setRefundDialogOpen(false);
      setRefundReason('');
      setRefundStripeId('');
      setRefundCreditNoteNumber('');
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      onOpenChange(false);

    } catch (err: any) {
      toast.error('Refund nije uspio: ' + (err?.message ?? 'nepoznata greška'));
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleSave = async () => {
    if (!attendee.attendee_id) return;
    setIsSaving(true);
    try {
      const { error: attError } = await supabase
        .from('attendees')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email || null,
          phone: form.phone || null,
          oib: form.oib || null,
          institution: form.institution || null,
          specialty: form.specialty || null,
          requires_invoice: form.requires_invoice,
        })

        .eq('id', attendee.attendee_id);

      if (attError) throw attError;

      if (attendee.order_id) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : null,
            fiscal_invoice_number: form.fiscal_invoice_number || null,
            payment_method: form.payment_method || null,
            status: form.order_status as 'cancelled' | 'draft' | 'issued' | 'overdue' | 'paid' | 'refunded' | 'deferred',
            payer_type: form.payer_type as 'individual' | 'company' | 'sponsor',
            payer_name: form.payer_name,
            payer_oib: form.payer_type === 'company' ? (form.payer_oib || null) : null,
            payer_address: form.payer_type === 'company' ? (form.payer_address || null) : null,
            payer_city: form.payer_type === 'company' ? (form.payer_city || null) : null,
            payer_postal_code: form.payer_type === 'company' ? (form.payer_postal_code || null) : null,
            payer_country_code: form.payer_country_code || null,
            payer_country_name: form.payer_country_name || null,
            billing_email: form.billing_email || null,
            po_number: form.po_number || null,
            lang: form.lang,
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uredi polaznika</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Podaci sudionika</h3>
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
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>OIB</Label>
                  <Input
                    value={form.oib}
                    onChange={e => setForm(f => ({ ...f, oib: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Institucija / Tvrtka</Label>
                <Input
                  value={form.institution}
                  onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Specijalnost</Label>
                <Input
                  value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.requires_invoice}
                  onCheckedChange={v => setForm(f => ({ ...f, requires_invoice: v === true }))}
                />
                Traži račun
              </label>
            </div>

            <div className="pt-2 border-t space-y-1.5">
              <h3 className="text-sm font-semibold">Podaci narudžbe</h3>
              {attendee.is_group_order && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Ova narudžba (#{attendee.order_number}) dijeli više sudionika. Promjena ovih polja vrijedi za CIJELU narudžbu, ne samo za {attendee.first_name} {attendee.last_name}.
                  </AlertDescription>
                </Alert>
              )}
            </div>


            {!attendee.order_id && (
              <p className="text-xs text-muted-foreground">
                Polaznik nema narudžbu — financijske podatke nije moguće uređivati.
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Datum plaćanja</Label>
              <Input
                type="date"
                value={form.paid_at}
                disabled={!attendee.order_id}
                onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Broj računa</Label>
              <Input
                placeholder="npr. 2026-01-0001"
                value={form.fiscal_invoice_number}
                disabled={!attendee.order_id}
                onChange={e => setForm(f => ({ ...f, fiscal_invoice_number: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Način plaćanja</Label>
              <Select
                value={form.payment_method}
                onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}
                disabled={!attendee.order_id}
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
                onValueChange={handleOrderStatusChange}
                disabled={!attendee.order_id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Skica</SelectItem>
                  <SelectItem value="issued">Izdano (čeka uplatu)</SelectItem>
                  <SelectItem value="deferred">Plaćanje po ugovoru</SelectItem>
                  <SelectItem value="paid">Plaćeno</SelectItem>
                  <SelectItem value="overdue">Kasni</SelectItem>
                  <SelectItem value="refunded">Refundirano</SelectItem>
                  <SelectItem value="cancelled">Otkazano</SelectItem>
                </SelectContent>
              </Select>
              {attendee.is_group_order && (
                <p className="text-xs text-muted-foreground">
                  Ovo je grupna narudžba. Odabir "Refundirano" otvara poseban dijalog gdje biraš koje sudionike/stavke refundiraš — ostali ostaju nepromijenjeni.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Platitelj</Label>
              <Select
                value={form.payer_type}
                onValueChange={v => setForm(f => ({ ...f, payer_type: v }))}
                disabled={!attendee.order_id}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Fizička osoba</SelectItem>
                  <SelectItem value="company">Tvrtka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Naziv platitelja</Label>
              <Input
                value={form.payer_name}
                disabled={!attendee.order_id}
                onChange={e => setForm(f => ({ ...f, payer_name: e.target.value }))}
              />
            </div>

            {form.payer_type === 'company' && (
              <>
                <div className="space-y-1.5">
                  <Label>OIB / VAT</Label>
                  <Input
                    value={form.payer_oib}
                    disabled={!attendee.order_id}
                    onChange={e => setForm(f => ({ ...f, payer_oib: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Adresa</Label>
                  <Input
                    value={form.payer_address}
                    disabled={!attendee.order_id}
                    onChange={e => setForm(f => ({ ...f, payer_address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Grad</Label>
                    <Input
                      value={form.payer_city}
                      disabled={!attendee.order_id}
                      onChange={e => setForm(f => ({ ...f, payer_city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Poštanski broj</Label>
                    <Input
                      value={form.payer_postal_code}
                      disabled={!attendee.order_id}
                      onChange={e => setForm(f => ({ ...f, payer_postal_code: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Država</Label>
                  <Select
                    value={form.payer_country_code}
                    onValueChange={v => setForm(f => ({ ...f, payer_country_code: v, payer_country_name: getCountryName(v) }))}
                    disabled={!attendee.order_id}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Email za račun</Label>
              <Input
                type="email"
                value={form.billing_email}
                disabled={!attendee.order_id}
                onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>PO broj</Label>
              <Input
                value={form.po_number}
                disabled={!attendee.order_id}
                onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Jezik komunikacije</Label>
              <Select
                value={form.lang}
                onValueChange={v => setForm(f => ({ ...f, lang: v }))}
                disabled={!attendee.order_id}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">Hrvatski</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>



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

            {attendee.attendee_id && refundsList.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <h3 className="text-sm font-semibold">Povrati</h3>
                {refundsList.map(r => (
                  <div key={r.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{Number(r.amount ?? 0).toFixed(2)} EUR</span>
                      <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{r.reason || '—'}</div>
                    <div className="flex items-end gap-2">
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-xs">Broj odobrenja</Label>
                        <Input
                          value={creditNoteDrafts[r.id] ?? ''}
                          onChange={e =>
                            setCreditNoteDrafts(prev => ({ ...prev, [r.id]: e.target.value }))
                          }
                          placeholder="npr. ODO-2026-0001"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingCreditNoteId === r.id}
                        onClick={() => handleSaveCreditNote(r.id)}
                      >
                        {savingCreditNoteId === r.id ? '...' : 'Spremi'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {needsGroupConfirm && (
              <label className="flex items-start gap-2 text-sm cursor-pointer pt-2 border-t">
                <Checkbox
                  checked={groupChangeConfirmed}
                  onCheckedChange={v => setGroupChangeConfirmed(v === true)}
                />
                <span>
                  Razumijem da se ova promjena primjenjuje na cijelu narudžbu #{attendee.order_number}
                </span>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Odustani
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (needsGroupConfirm && !groupChangeConfirmed)}>
              {isSaving ? 'Spremanje...' : 'Spremi'}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refund narudžbe {attendee.order_number ? `#${attendee.order_number}` : ''}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Označi koje sudionike/stavke iz ove narudžbe refundiraš. Ostali sudionici u narudžbi ostaju netaknuti (status im se ne mijenja).
            </p>

            <div className="space-y-1">
              {refundItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRefundItemIds.includes(item.id)}
                      onCheckedChange={() => toggleRefundItem(item.id)}
                    />
                    <span>{`${item.first_name || ''} ${item.last_name || ''}`.trim() || '—'}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {item.total_price != null ? `${item.total_price.toFixed(2)} EUR` : '—'}
                  </span>
                </label>
              ))}
            </div>

            {refundItems.length > 1 && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={selectAllRefundItems}>
                Označi sve (cijela narudžba)
              </Button>
            )}

            <div className="space-y-1.5">
              <Label>Razlog (opcionalno)</Label>
              <Textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="npr. na zahtjev korisnika"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Stripe refund ID (opcionalno)</Label>
              <Input
                value={refundStripeId}
                onChange={e => setRefundStripeId(e.target.value)}
                placeholder="re_..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Broj odobrenja (ako je već poznat)</Label>
              <Input
                value={refundCreditNoteNumber}
                onChange={e => setRefundCreditNoteNumber(e.target.value)}
                placeholder="npr. ODO-2026-0001"
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)} disabled={isProcessingRefund}>
              Odustani
            </Button>
            <Button
              onClick={handleConfirmRefund}
              disabled={isProcessingRefund || selectedRefundItemIds.length === 0}
            >
              {isProcessingRefund ? 'Obrada...' : `Potvrdi refund (${selectedRefundItemIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<InvoiceAttendee | null>(null);
  const [editAttendee, setEditAttendee] = useState<InvoiceAttendee | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'stripe' | 'invoice'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('paid_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { t } = useAdminLanguage();

  const formatAmount = (n: number | null | undefined) =>
    n == null ? '—' : `${n.toFixed(2).replace('.', ',')} ${currency}`;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const getSortValue = (a: InvoiceAttendee, key: SortKey): number | string => {
    switch (key) {
      case 'order_number':
        return a.order_number ?? -Infinity;
      case 'name':
        return `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      case 'email':
        return (a.email || '').toLowerCase();
      case 'company':
        return (a.payer_type === 'company' ? (a.payer_name || '') : '').toLowerCase();
      case 'registered_at':
        return a.registered_at ? new Date(a.registered_at).getTime() : -Infinity;
      case 'deadline': {
        const d = getDeadlineDate(a);
        return d ? d.getTime() : -Infinity;
      }
      case 'quote_number':
        return (a.bc_quote_number || '').toLowerCase();
      case 'paid_at':
        return a.paid_at ? new Date(a.paid_at).getTime() : -Infinity;
      case 'invoice_number':
        return (a.fiscal_invoice_number || '').toLowerCase();
      case 'amount':
        return a.price_paid ?? -Infinity;
      case 'payment_method':
        return (a.payment_method || '').toLowerCase();
      case 'payment_status':
        return (a.payment_status || '').toLowerCase();
      case 'checked_in':
        return a.checked_in ? 1 : 0;
      default:
        return '';
    }
  };

  const filtered = attendees.filter(a => {
    if (paymentFilter !== 'all' && a.payment_status !== paymentFilter) return false;
    if (methodFilter !== 'all' && a.payment_method !== methodFilter) return false;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const fullName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const email = (a.email || '').toLowerCase();
      const payer = (a.payer_name || '').toLowerCase();
      const quoteNumber = (a.bc_quote_number || '').toLowerCase();
      if (
        !fullName.includes(term) &&
        !email.includes(term) &&
        !payer.includes(term) &&
        !quoteNumber.includes(term)
      ) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((x, y) => {
    const vx = getSortValue(x, sortKey);
    const vy = getSortValue(y, sortKey);
    if (vx < vy) return sortDir === 'asc' ? -1 : 1;
    if (vx > vy) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });



  const filteredPaidSum = filtered.reduce(
    (acc, a) => acc + (a.payment_status === 'paid' ? Number(a.price_paid ?? 0) : 0),
    0,
  );

  const handleExportCsv = async () => {
    if (!sorted.length) return;
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
      ].map(csvText);

      const rows = sorted.map(a => {
        const deadline = formatDate(getDeadlineDate(a));
        return [
          csvText(a.order_number ? `#${a.order_number}` : '—'),
          csvText(`${a.first_name || ''} ${a.last_name || ''}`.trim()),
          csvText(a.email || '—'),
          csvText(a.payer_type === 'company' ? (a.payer_name || '—') : '—'),
          csvText(formatDate(a.registered_at)),
          csvText(deadline),
          csvText(a.bc_quote_number || '—'),
          csvText(formatDate(a.paid_at)),
          csvText(a.fiscal_invoice_number || '—'),
          csvNumber(a.price_paid),
          csvText(getPaymentMethodLabel(a.payment_method, a.card_brand, a.card_wallet)),
          csvText(a.payment_status || '—'),
          csvText(a.checked_in ? 'Prijavljen' : 'Nije prijavljen'),
        ];
      });

      const emptyRow = headers.map(() => '');
      const totalRow = [
        csvText('UKUPNO UPLAĆENO'), '', '', '', '', '', '', '', '',
        csvNumber(filteredPaidSum),
        '', '', '',
      ];

      const csvContent = '\uFEFF' + [headers, ...rows, emptyRow, totalRow]
        .map(row => row.join(';'))
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

  const SortableHead = ({
    label,
    sortKeyName,
    className = '',
    align = 'left',
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
    align?: 'left' | 'right';
  }) => (
    <TableHead
      className={`py-2.5 px-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(sortKeyName)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : ''}`}>
        {label}
        {sortKey === sortKeyName ? (
          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );

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
                disabled={isExporting || !sorted.length}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Dodaj polaznika
              </Button>
              <Button size="sm" onClick={() => setIsGroupModalOpen(true)}>
                <Users className="h-4 w-4 mr-1.5" />
                Grupna prijava
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                <SelectItem value="deferred">Plaćanje po ugovoru ({attendees.filter(a => a.payment_status === 'deferred').length})</SelectItem>
                <SelectItem value="overdue">Kasni ({attendees.filter(a => a.payment_status === 'overdue').length})</SelectItem>
                <SelectItem value="refunded">Refundirano ({attendees.filter(a => a.payment_status === 'refunded').length})</SelectItem>
                <SelectItem value="cancelled">Otkazano ({attendees.filter(a => a.payment_status === 'cancelled').length})</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={methodFilter}
              onValueChange={v => setMethodFilter(v as 'all' | 'stripe' | 'invoice')}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi načini</SelectItem>
                <SelectItem value="stripe">Kartica</SelectItem>
                <SelectItem value="invoice">Virman</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pretraži ime, email, tvrtku, broj ponude..."
              className="w-64"
            />
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            Prikazano: {filtered.length} · Ukupno uplaćeno: {filteredPaidSum.toFixed(2)} EUR
          </div>

        </CardHeader>

        <CardContent className="px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Učitavanje...
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nema polaznika
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="h-12">
                    <SortableHead label="Narudžba #" sortKeyName="order_number" className="w-20" />
                    <SortableHead label="Ime i prezime" sortKeyName="name" />
                    <SortableHead label="Email" sortKeyName="email" />
                    <SortableHead label="Tvrtka/Org." sortKeyName="company" />
                    <SortableHead label="Datum reg." sortKeyName="registered_at" />
                    <SortableHead label="Rok plaćanja" sortKeyName="deadline" />
                    <SortableHead label="Br. ponude" sortKeyName="quote_number" />
                    <SortableHead label="Datum uplate" sortKeyName="paid_at" />
                    <SortableHead label="Br. računa" sortKeyName="invoice_number" />
                    <SortableHead label="Iznos" sortKeyName="amount" align="right" />
                    <SortableHead label="Plaćanje" sortKeyName="payment_method" />
                    <SortableHead label="Status" sortKeyName="payment_status" />
                    <SortableHead label="Check-in" sortKeyName="checked_in" />
                    <TableHead className="py-2 px-3 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(attendee => {
                    const deadline = formatDate(getDeadlineDate(attendee));

                    return (
                      <TableRow
                        key={attendee.attendee_id}
                        className="h-14 cursor-pointer hover:bg-muted/40 text-base"
                        onClick={() => setSelectedAttendee(attendee)}
                      >
                        <TableCell className="py-2.5 px-3 text-base font-mono">
                          {attendee.order_number ? `#${attendee.order_number}` : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base font-medium whitespace-nowrap">
                          {`${attendee.first_name || ''} ${attendee.last_name || ''}`.trim() || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">
                          {attendee.email || '—'}
                        </TableCell>
                        <TableCell
                          className="py-2.5 px-3 text-base text-muted-foreground max-w-[180px] truncate"
                          title={attendee.payer_type === 'company' ? (attendee.payer_name || '') : ''}
                        >
                          {attendee.payer_type === 'company' ? (attendee.payer_name || '—') : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base whitespace-nowrap">
                          {formatDate(attendee.registered_at)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base whitespace-nowrap">
                          {deadline}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base font-mono">
                          {attendee.bc_quote_number || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base whitespace-nowrap">
                          {formatDate(attendee.paid_at)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base font-mono">
                          {attendee.fiscal_invoice_number || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base whitespace-nowrap text-right font-mono">
                          {formatAmount(attendee.price_paid)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base whitespace-nowrap">
                          {getPaymentMethodLabel(attendee.payment_method, attendee.card_brand, attendee.card_wallet)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base">
                          {getPaymentBadge(attendee.payment_status)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-base">
                          {getCheckinBadge(attendee.checked_in)}
                        </TableCell>
                        <TableCell
                          onClick={e => { e.stopPropagation(); setEditAttendee(attendee); }}
                          className="py-2.5 px-3 text-right"
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

      <GroupRegistrationModal
        open={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
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
