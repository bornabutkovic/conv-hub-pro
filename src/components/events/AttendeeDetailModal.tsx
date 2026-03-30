import { Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AttendeeData {
  attendee_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  bc_invoice_number: string | null;
  order_number: number | null;
  order_status: string | null;
  payment_method: string | null;
  payer_name: string | null;
  total_amount: number | null;
  is_group_order: boolean | null;
}

interface AttendeeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendee: AttendeeData | null;
  currency: string;
}

export function AttendeeDetailModal({ open, onOpenChange, attendee, currency }: AttendeeDetailModalProps) {
  if (!attendee) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopirano u međuspremnik');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(amount);
  };

  const getOrderStatusLabel = (status: string | null) => {
    switch (status) {
      case 'draft': return 'Nacrt';
      case 'issued': return 'Izdano';
      case 'paid': return 'Plaćeno';
      case 'overdue': return 'Dospjelo';
      case 'refunded': return 'Povrat';
      case 'cancelled': return 'Otkazano';
      default: return status || '—';
    }
  };

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Broj ponude',
      value: attendee.bc_invoice_number ? (
        <button
          onClick={() => copyToClipboard(attendee.bc_invoice_number!)}
          className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
          title="Klikni za kopiranje"
        >
          {attendee.bc_invoice_number}
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : '—',
    },
    { label: 'Broj narudžbe', value: attendee.order_number != null ? `#${attendee.order_number}` : '—' },
    { label: 'Status narudžbe', value: getOrderStatusLabel(attendee.order_status) },
    { label: 'Način plaćanja', value: attendee.payment_method || '—' },
    { label: 'Platitelj', value: attendee.payer_name || '—' },
    { label: 'Iznos', value: formatCurrency(attendee.total_amount) },
    {
      label: 'Grupna narudžba',
      value: attendee.is_group_order ? (
        <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 hover:bg-blue-500/15">Da</Badge>
      ) : (
        <Badge variant="secondary">Ne</Badge>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {attendee.first_name} {attendee.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Financijski podaci
          </h4>
          <div className="divide-y divide-border rounded-md border">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
