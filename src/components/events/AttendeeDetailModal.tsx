import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AttendeeData {
  attendee_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  ticket_tier_id: string | null;
  checked_in: boolean | null;
  payment_status: string | null;
  bc_quote_number: string | null;
  paid_at: string | null;
  fiscal_invoice_number: string | null;
  order_number: number | null;
  order_status: string | null;
  payment_method: string | null;
  payer_name: string | null;
  total_amount: number | null;
}

interface AttendeeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendee: AttendeeData | null;
  currency: string;
}

interface ServiceRow {
  id: string;
  name: string;
  total_price: number;
}

export function AttendeeDetailModal({ open, onOpenChange, attendee, currency }: AttendeeDetailModalProps) {
  const [tierName, setTierName] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);

  useEffect(() => {
    if (!open || !attendee) return;

    if (attendee.ticket_tier_id) {
      supabase
        .from('ticket_tiers')
        .select('name')
        .eq('id', attendee.ticket_tier_id)
        .maybeSingle()
        .then(({ data }) => setTierName(data?.name ?? null));
    } else {
      setTierName(null);
    }

    if (attendee.attendee_id) {
      supabase
        .from('order_items')
        .select('id, total_price, event_services(name)')
        .eq('attendee_id', attendee.attendee_id)
        .not('service_id', 'is', null)
        .then(({ data }) => {
          const rows: ServiceRow[] = (data || []).map((r: any) => ({
            id: r.id,
            name: r.event_services?.name || '—',
            total_price: Number(r.total_price) || 0,
          }));
          setServices(rows);
        });
    } else {
      setServices([]);
    }
  }, [open, attendee]);

  if (!attendee) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopirano u međuspremnik');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(amount);
  };

  const getPaymentBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/15 text-green-700 border-green-500/20 hover:bg-green-500/15">Plaćeno</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15">Nije plaćeno</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15">Kasni</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/20 hover:bg-purple-500/15">Refundirano</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/15 text-gray-700 border-gray-500/20 hover:bg-gray-500/15">Otkazano</Badge>;
      default:
        return <Badge variant="secondary">{status || '—'}</Badge>;
    }
  };

  const attendeeRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Email', value: attendee.email || '—' },
    { label: 'Status plaćanja', value: getPaymentBadge(attendee.payment_status) },
    {
      label: 'Check-in',
      value: attendee.checked_in ? (
        <Badge className="bg-green-500/15 text-green-700 border-green-500/20 hover:bg-green-500/15">Prijavljen</Badge>
      ) : (
        <Badge className="bg-gray-500/15 text-gray-700 border-gray-500/20 hover:bg-gray-500/15">Nije prijavljen</Badge>
      ),
    },
  ];

  const ticketRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Vrsta karte', value: tierName || '—' },
    {
      label: 'Broj ponude',
      value: attendee.bc_quote_number ? (
        <button
          onClick={() => copyToClipboard(attendee.bc_quote_number!)}
          className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
          title="Klikni za kopiranje"
        >
          {attendee.bc_quote_number}
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : '—',
    },
    { label: 'Iznos', value: formatCurrency(attendee.total_amount) },
    { label: 'Platitelj', value: attendee.payer_name || '—' },
  ];

  const renderRows = (rows: { label: string; value: React.ReactNode }[]) => (
    <div className="divide-y divide-border rounded-md border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {attendee.first_name} {attendee.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-1">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Polaznik</h4>
            {renderRows(attendeeRows)}
          </section>

          <section className="space-y-1">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Karta</h4>
            {renderRows(ticketRows)}
          </section>

          <section className="space-y-1">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dodatne usluge</h4>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3 py-2.5 rounded-md border">Nema dodatnih usluga</p>
            ) : (
              <div className="divide-y divide-border rounded-md border">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <span className="text-foreground">{s.name}</span>
                    <span className="font-medium text-foreground">{formatCurrency(s.total_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">QR kod karte</h4>
            <div className="flex flex-col items-center gap-2 py-3 rounded-md border">
              {attendee.attendee_id && (
                <QRCodeSVG value={`https://scanner.conwayo.app/ticket/${attendee.attendee_id}`} size={120} />
              )}
              <span className="text-xs text-muted-foreground">Scanner: scanner.conwayo.app</span>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
