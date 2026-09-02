import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Minus, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES, getCountryName, getCountryZone } from '@/lib/countries';

interface TicketTier {
  id: string;
  name: string;
  price: number;
}

interface GroupRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

type PayerType = 'individual' | 'company';
type PaymentMethod = 'invoice' | 'stripe';
type Lang = 'hr' | 'en';

interface AttendeeRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  oib: string;
  specialty: string;
  institution: string;
  tierId: string;
  tierName: string;
}

export function GroupRegistrationModal({ open, onOpenChange, eventId }: GroupRegistrationModalProps) {
  const queryClient = useQueryClient();

  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [contactPhone, setContactPhone] = useState('');
  const [payerType, setPayerType] = useState<PayerType>('individual');
  const [payerName, setPayerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyOib, setCompanyOib] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const [payerCity, setPayerCity] = useState('');
  const [payerPostalCode, setPayerPostalCode] = useState('');
  const [payerCountryCode, setPayerCountryCode] = useState('HR');
  const [payerCountryName, setPayerCountryName] = useState('Croatia');
  const [billingEmail, setBillingEmail] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('invoice');
  const [lang, setLang] = useState<Lang>('hr');
  const [markPaid, setMarkPaid] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  const resetState = () => {
    setTicketQuantities({});
    setAttendees([]);
    setExpanded({});
    setContactPhone('');
    setPayerType('individual');
    setPayerName('');
    setCompanyName('');
    setCompanyOib('');
    setPayerAddress('');
    setPayerCity('');
    setPayerPostalCode('');
    setPayerCountryCode('HR');
    setPayerCountryName('Croatia');
    setBillingEmail('');
    setPoNumber('');
    setPaymentMethod('invoice');
    setLang('hr');
    setMarkPaid(false);
    setConsentConfirmed(false);
  };

  const { data: ticketTiers } = useQuery({
    queryKey: ['ticket-tiers', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('id, name, price')
        .eq('event_id', eventId)
        .order('price', { ascending: true });
      if (error) throw error;
      return data as TicketTier[];
    },
    enabled: open && !!eventId,
  });

  // Rebuild attendee rows whenever quantities change, preserving already typed data.
  useEffect(() => {
    if (!ticketTiers) return;
    setAttendees(prev => {
      const next: AttendeeRow[] = [];
      for (const tier of ticketTiers) {
        const qty = ticketQuantities[tier.id] || 0;
        const existingForTier = prev.filter(a => a.tierId === tier.id);
        for (let i = 0; i < qty; i++) {
          next.push(
            existingForTier[i] || {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              oib: '',
              specialty: '',
              institution: '',
              tierId: tier.id,
              tierName: tier.name,
            }
          );
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketQuantities, ticketTiers]);

  const totalTickets = useMemo(
    () => Object.values(ticketQuantities).reduce((s, q) => s + (q || 0), 0),
    [ticketQuantities]
  );

  const totalAmount = useMemo(() => {
    if (!ticketTiers) return 0;
    return ticketTiers.reduce(
      (sum, t) => sum + (ticketQuantities[t.id] || 0) * Number(t.price || 0),
      0
    );
  }, [ticketTiers, ticketQuantities]);

  const setQty = (tierId: string, delta: number) => {
    setTicketQuantities(prev => {
      const next = Math.max(0, (prev[tierId] || 0) + delta);
      return { ...prev, [tierId]: next };
    });
  };

  const updateAttendee = (index: number, patch: Partial<AttendeeRow>) => {
    setAttendees(prev => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (totalTickets < 1) throw new Error('Odaberi barem jednu kotizaciju.');
      for (const [i, a] of attendees.entries()) {
        if (!a.firstName.trim() || !a.lastName.trim() || !a.email.trim()) {
          throw new Error(`Sudionik ${i + 1}: ime, prezime i email su obavezni.`);
        }
      }
      if (payerType === 'company' && !companyName.trim()) {
        throw new Error('Naziv tvrtke je obavezan.');
      }
      if (payerType === 'individual' && !payerName.trim()) {
        throw new Error('Naziv platitelja je obavezan.');
      }
      if (!consentConfirmed) throw new Error('Potvrda privole je obavezna.');

      const nowIso = new Date().toISOString();

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          event_id: eventId,
          payer_type: payerType,
          lang,
          attendees: attendees.map(a => ({
            first_name: a.firstName.trim(),
            last_name: a.lastName.trim(),
            email: a.email.trim(),
            phone: a.phone.trim() || contactPhone.trim() || null,
            ticket_tier_id: a.tierId,
            oib: a.oib.trim() || null,
            specialty: a.specialty.trim() || null,
            institution: a.institution.trim() || null,
          })),
          payer_address: payerType === 'company' ? payerAddress.trim() : null,
          payer_city: payerType === 'company' ? payerCity.trim() : null,
          payer_postal_code: payerType === 'company' ? payerPostalCode.trim() : null,
          payer_country_code: payerCountryCode,
          payer_country_name: payerCountryName,
          payer_name: payerType === 'company' ? companyName.trim() : payerName.trim(),
          company_name: payerType === 'company' ? companyName.trim() : undefined,
          company_oib: payerType === 'company' ? companyOib.trim() : undefined,
          billing_email: billingEmail.trim() || attendees[0]?.email.trim(),
          po_number: payerType === 'company' ? poNumber.trim() : undefined,
          payment_method: paymentMethod,
          profile_id: null,
          terms_accepted: true,
          terms_accepted_at: nowIso,
          gdpr_consent_given: true,
          gdpr_consent_at: nowIso,
        },
      });

      const result = data as { success?: boolean; order_id?: string; order_number?: number; error?: string } | null;
      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Kreiranje narudžbe nije uspjelo.');
      }

      const orderId = result.order_id as string;

      if (paymentMethod === 'invoice') {
        const { data: invData, error: invError } = await supabase.functions.invoke(
          'create-invoice-registration',
          {
            body: {
              order_id: orderId,
              event_id: eventId,
              payer_type: payerType,
              first_name: attendees[0].firstName.trim(),
              last_name: attendees[0].lastName.trim(),
              email: attendees[0].email.trim(),
              phone: contactPhone.trim() || null,
              profile_id: null,
              company_name: payerType === 'company' ? companyName.trim() : undefined,
              company_oib: payerType === 'company' ? companyOib.trim() : null,
              company_address: payerAddress.trim() || null,
              company_city: payerCity.trim() || null,
              company_postal_code: payerPostalCode.trim() || null,
              company_country_code: payerCountryCode,
              company_country_name: payerCountryName,
              bc_posting_zone: getCountryZone(payerCountryCode),
              billing_email: billingEmail.trim() || attendees[0].email.trim(),
              po_number: poNumber.trim() || null,
              tickets: Object.entries(ticketQuantities)
                .filter(([, q]) => q > 0)
                .map(([tierId, q]) => ({ ticket_tier_id: tierId, quantity: q })),
              services: [],
              lang,
            },
          }
        );
        const invResult = invData as { success?: boolean; error?: string } | null;
        if (invError || (invResult && invResult.success === false)) {
          toast.error(
            'Narudžba je kreirana, ali ponuda/email nisu poslani — provjeri n8n ručno.'
          );
        }
      } else {
        const { error: statusError } = await supabase
          .from('orders')
          .update({ status: markPaid ? 'paid' : 'issued' })
          .eq('id', orderId);
        if (statusError) throw statusError;
      }

      return { orderNumber: result.order_number, count: attendees.length };
    },
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-revenue-stats', eventId] });
      toast.success(
        `Grupna prijava kreirana — narudžba #${res.orderNumber ?? ''}, ${res.count} sudionika`
      );
      onOpenChange(false);
      resetState();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Grupna prijava nije uspjela.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grupna prijava</DialogTitle>
          <DialogDescription>
            Jedna narudžba s više sudionika — kreira order, sudionike i stavke.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Tickets */}
          <div className="space-y-2">
            <Label>Kotizacije</Label>
            {ticketTiers?.map(tier => (
              <div key={tier.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{tier.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Number(tier.price).toFixed(2)} EUR
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty(tier.id, -1)}
                    disabled={(ticketQuantities[tier.id] || 0) === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm">{ticketQuantities[tier.id] || 0}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQty(tier.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {totalTickets > 0 && (
              <p className="text-xs text-muted-foreground">
                Ukupno: {totalTickets} kotizacija — {totalAmount.toFixed(2)} EUR
              </p>
            )}
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="space-y-3">
              <Label>Sudionici</Label>
              {attendees.map((a, i) => (
                <div key={i} className="rounded-md border p-3 space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    #{i + 1} — {a.tierName}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ime *</Label>
                      <Input
                        value={a.firstName}
                        onChange={e => updateAttendee(i, { firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Prezime *</Label>
                      <Input
                        value={a.lastName}
                        onChange={e => updateAttendee(i, { lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      value={a.email}
                      onChange={e => updateAttendee(i, { email: e.target.value })}
                    />
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                  >
                    {expanded[i] ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    Dodatno
                  </button>

                  {expanded[i] && (
                    <div className="grid gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Telefon</Label>
                        <Input
                          value={a.phone}
                          onChange={e => updateAttendee(i, { phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">OIB</Label>
                        <Input
                          value={a.oib}
                          onChange={e => updateAttendee(i, { oib: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Specijalnost</Label>
                        <Input
                          value={a.specialty}
                          onChange={e => updateAttendee(i, { specialty: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Institucija</Label>
                        <Input
                          value={a.institution}
                          onChange={e => updateAttendee(i, { institution: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Kontakt telefon</Label>
            <Input
              type="tel"
              placeholder="+385 91 234 5678"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Koristi se za sudionike bez vlastitog broja.
            </p>
          </div>

          {/* Payer */}
          <div className="space-y-1.5">
            <Label>Tko plaća</Label>
            <Select value={payerType} onValueChange={(v: PayerType) => setPayerType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Fizička osoba</SelectItem>
                <SelectItem value="company">Tvrtka</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {payerType === 'individual' ? (
            <div className="space-y-1.5">
              <Label>Naziv platitelja *</Label>
              <Input value={payerName} onChange={e => setPayerName(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Naziv tvrtke *</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>OIB / VAT ID</Label>
                <Input value={companyOib} onChange={e => setCompanyOib(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Adresa</Label>
                <Input value={payerAddress} onChange={e => setPayerAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Grad</Label>
                  <Input value={payerCity} onChange={e => setPayerCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Poštanski broj</Label>
                  <Input
                    value={payerPostalCode}
                    onChange={e => setPayerPostalCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Država</Label>
                <Select
                  value={payerCountryCode}
                  onValueChange={v => {
                    setPayerCountryCode(v);
                    setPayerCountryName(getCountryName(v));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>PO broj</Label>
                <Input value={poNumber} onChange={e => setPoNumber(e.target.value)} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Email za račun</Label>
            <Input
              type="email"
              value={billingEmail}
              placeholder={attendees[0]?.email || 'racuni@primjer.hr'}
              onChange={e => setBillingEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Način plaćanja</Label>
            <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Virman</SelectItem>
                <SelectItem value="stripe">Kartica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Jezik komunikacije</Label>
            <Select value={lang} onValueChange={(v: Lang) => setLang(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hr">Hrvatski</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'stripe' && (
            <div className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox
                id="groupMarkPaid"
                checked={markPaid}
                onCheckedChange={v => setMarkPaid(v === true)}
              />
              <div className="grid gap-1 leading-none">
                <Label htmlFor="groupMarkPaid" className="cursor-pointer">
                  Uplata zaprimljena — označi kao plaćeno
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ako je označeno, sudionicima se automatski šalju ulaznice.
                </p>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2 rounded-md border p-3 text-sm cursor-pointer">
            <Checkbox
              checked={consentConfirmed}
              onCheckedChange={v => setConsentConfirmed(v === true)}
            />
            <span>
              Sudionik(ci) su usmeno/pismeno potvrdili Uvjete kupnje i privolu za obradu osobnih
              podataka
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Odustani
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !consentConfirmed}
          >
            {mutation.isPending ? 'Kreiranje...' : 'Kreiraj grupnu prijavu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
