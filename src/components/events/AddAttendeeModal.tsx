import { useEffect, useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useStateDraft } from '@/hooks/useFormDraft';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  erp_code: string | null;
}

interface ExistingOrder {
  id: string;
  order_number: number;
  payer_name: string;
  billing_email: string | null;
  total_amount: number | null;
  status: string;
  bc_quote_number: string | null;
}

interface AddAttendeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

type PayerType = 'individual' | 'company';
type PaymentMethod = 'invoice' | 'stripe';
type Lang = 'hr' | 'en';

const ATTACHABLE_STATUSES = ['draft', 'issued', 'overdue', 'deferred'] as const;

export function AddAttendeeModal({ open, onOpenChange, eventId }: AddAttendeeModalProps) {
  const queryClient = useQueryClient();
  const initialData = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    ticketTierId: '',
    pricePaid: 0,
    payerType: 'individual' as PayerType,
    payerName: '',
    companyOib: '',
    payerAddress: '',
    payerCity: '',
    payerPostalCode: '',
    payerCountryCode: 'HR',
    payerCountryName: 'Croatia',
    poNumber: '',
    billingEmail: '',
    paymentMethod: 'invoice' as PaymentMethod,
    lang: 'hr' as Lang,
    markPaid: false,
    attachMode: false,
    existingOrderId: '',
  };
  const { restoredData, saveDraft, clearDraft } = useStateDraft(`add_attendee_${eventId}`, initialData, { enabled: open });
  const [formData, setFormData] = useState(restoredData);

  const updateFormData = (newData: typeof formData) => {
    setFormData(newData);
    saveDraft(newData);
  };

  useEffect(() => {
    if (formData.payerType === 'individual' && !formData.attachMode) {
      const auto = `${formData.firstName} ${formData.lastName}`.trim();
      if (formData.payerName !== auto) {
        updateFormData({ ...formData, payerName: auto });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.firstName, formData.lastName, formData.payerType, formData.attachMode]);

  const { data: ticketTiers } = useQuery({
    queryKey: ['ticket-tiers', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('id, name, price, erp_code')
        .eq('event_id', eventId)
        .order('price', { ascending: true });
      if (error) throw error;
      return data as TicketTier[];
    },
    enabled: open && !!eventId,
  });

  const { data: existingOrders, isFetching: isFetchingOrders } = useQuery({
    queryKey: ['attachable-orders', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, payer_name, billing_email, total_amount, status, bc_quote_number')
        .eq('event_id', eventId)
        .in('status', ATTACHABLE_STATUSES)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExistingOrder[];
    },
    enabled: open && !!eventId && formData.attachMode,
  });

  const selectedExistingOrder = existingOrders?.find(o => o.id === formData.existingOrderId) || null;

  const handleTicketTierChange = (tierId: string) => {
    const tier = ticketTiers?.find(t => t.id === tierId);
    updateFormData({
      ...formData,
      ticketTierId: tierId,
      pricePaid: tier?.price || 0,
    });
  };

  const addAttendeeMutation = useMutation({
    mutationFn: async () => {
      const phone = formData.phone.trim();
      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const email = formData.email.trim() || null;

      if (formData.attachMode && !formData.existingOrderId) {
        throw new Error('Odaberi narudžbu na koju dodaješ polaznika.');
      }

      let profileId: string;
      let matchedExisting = false;

      if (email) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone')
          .eq('email', email)
          .maybeSingle();

        if (existingProfile) {
          matchedExisting = true;
          profileId = existingProfile.id;
          const updateData: Record<string, string> = {};
          if (!existingProfile.first_name && firstName) updateData.first_name = firstName;
          if (!existingProfile.last_name && lastName) updateData.last_name = lastName;
          if (!existingProfile.phone && phone) updateData.phone = phone;
          if (Object.keys(updateData).length > 0) {
            await supabase.from('profiles').update(updateData).eq('id', profileId);
          }
        } else {
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              first_name: firstName,
              last_name: lastName,
              phone: phone || null,
              email,
              role: 'user',
            })
            .select('id')
            .single();
          if (profileError) throw profileError;
          profileId = newProfile.id;
        }
      } else {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            email: null,
            role: 'user',
          })
          .select('id')
          .single();
        if (profileError) throw profileError;
        profileId = newProfile.id;
      }

      if (matchedExisting) {
        const { data: existingAttendee } = await supabase
          .from('attendees')
          .select('id')
          .eq('event_id', eventId)
          .eq('profile_id', profileId)
          .maybeSingle();
        if (existingAttendee) {
          throw new Error('Ovaj email je već registriran za ovaj event.');
        }
      }

      const selectedTier = ticketTiers?.find(t => t.id === formData.ticketTierId) || null;
      const pricePaid = formData.pricePaid;

      const { data: newAttendee, error: attendeeError } = await supabase
        .from('attendees')
        .insert({
          event_id: eventId,
          profile_id: profileId,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          status: 'approved',
          ticket_tier_id: formData.ticketTierId,
          price_paid: pricePaid,
          erp_sku: selectedTier?.erp_code || null,
        })
        .select('id')
        .single();

      if (attendeeError) throw attendeeError;
      const attendeeId = newAttendee.id;

      let createdOrderId: string | null = null;
      let createdOrderItemId: string | null = null;

      try {
        const { data: eventRow } = await supabase
          .from('events')
          .select('vat_rate')
          .eq('id', eventId)
          .single();
        const vatRate = Number(eventRow?.vat_rate ?? 25);
        const vatAmount = Number((pricePaid * vatRate / (100 + vatRate)).toFixed(2));

        if (formData.attachMode) {
          if (!selectedExistingOrder) {
            throw new Error('Odabrana narudžba više nije dostupna. Osvježi i pokušaj ponovno.');
          }

          const { data: newItem, error: itemError } = await supabase
            .from('order_items')
            .insert({
              order_id: selectedExistingOrder.id,
              attendee_id: attendeeId,
              ticket_type_id: formData.ticketTierId,
              description: selectedTier?.name || 'Ticket',
              quantity: 1,
              unit_price: pricePaid,
              total_price: pricePaid,
              price_at_purchase: pricePaid,
              vat_amount: vatAmount,
              erp_code: selectedTier?.erp_code || null,
              item_type: 'ticket',
            })
            .select('id')
            .single();
          if (itemError) throw itemError;
          createdOrderItemId = newItem.id;

          const newTotal = Number(selectedExistingOrder.total_amount || 0) + pricePaid;
          const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ total_amount: newTotal, is_group_order: true })
            .eq('id', selectedExistingOrder.id);
          if (orderUpdateError) throw orderUpdateError;

          return {
            orderNumber: selectedExistingOrder.order_number,
            markedPaid: false,
            attachedToExisting: true,
          };
        }

        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            event_id: eventId,
            attendee_id: attendeeId,
            status: 'issued',
            source: 'manual',
            payment_method: formData.paymentMethod,
            lang: formData.lang,
            payer_type: formData.payerType,
            payer_name: formData.payerName.trim() || `${firstName} ${lastName}`.trim(),
            payer_oib: formData.payerType === 'company' ? (formData.companyOib.trim() || null) : null,
            payer_address: formData.payerAddress.trim() || null,
            payer_city: formData.payerCity.trim() || null,
            payer_postal_code: formData.payerPostalCode.trim() || null,
            payer_country_code: formData.payerCountryCode,
            payer_country_name: formData.payerCountryName,
            po_number: formData.poNumber.trim() || null,
            billing_email: formData.billingEmail.trim() || null,
            contact_name: `${firstName} ${lastName}`.trim(),
            contact_email: email,
            contact_phone: phone,
            total_amount: pricePaid,
            is_group_order: false,
          })
          .select('id, order_number')
          .single();
        if (orderError) throw orderError;
        createdOrderId = newOrder.id;

        const { data: newItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrder.id,
            attendee_id: attendeeId,
            ticket_type_id: formData.ticketTierId,
            description: selectedTier?.name || 'Ticket',
            quantity: 1,
            unit_price: pricePaid,
            total_price: pricePaid,
            price_at_purchase: pricePaid,
            vat_amount: vatAmount,
            erp_code: selectedTier?.erp_code || null,
            item_type: 'ticket',
          })
          .select('id')
          .single();
        if (itemError) throw itemError;
        createdOrderItemId = newItem.id;

        if (formData.markPaid) {
          const { error: paidError } = await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', newOrder.id);
          if (paidError) throw paidError;
        }

        return { orderNumber: newOrder.order_number, markedPaid: formData.markPaid, attachedToExisting: false };
      } catch (err) {
        try {
          if (createdOrderItemId) {
            await supabase.from('order_items').delete().eq('id', createdOrderItemId);
          }
        } catch { /* swallow */ }
        try {
          if (createdOrderId) {
            await supabase.from('orders').delete().eq('id', createdOrderId);
          }
        } catch { /* swallow */ }
        try {
          await supabase.from('attendees').delete().eq('id', attendeeId);
        } catch { /* swallow */ }
        throw err;
      }
    },
    onSuccess: (result) => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-memberships', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-revenue-stats', eventId] });
      queryClient.invalidateQueries({ queryKey: ['attachable-orders', eventId] });
      if (result?.attachedToExisting) {
        toast.success(`Polaznik dodan na narudžbu #${result?.orderNumber ?? ''}`);
      } else if (result?.markedPaid) {
        toast.success('Polaznik dodan — ulaznica se šalje na email');
      } else {
        toast.success(`Polaznik dodan (narudžba #${result?.orderNumber ?? ''}, čeka uplatu)`);
      }
      onOpenChange(false);
      setFormData(initialData);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add attendee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return toast.error('First name is required');
    if (!formData.lastName.trim()) return toast.error('Last name is required');
    if (!formData.email.trim()) return toast.error('Email is required');
    if (!formData.ticketTierId) return toast.error('Odaberite kotizaciju');
    if (formData.attachMode) {
      if (!formData.existingOrderId) return toast.error('Odaberi narudžbu na koju dodaješ polaznika');
    } else if (formData.payerType === 'company' && !formData.payerName.trim()) {
      return toast.error('Naziv platitelja je obavezan za tvrtku');
    }
    addAttendeeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Attendee Manually</DialogTitle>
          <DialogDescription>
            Register a new attendee for this event. Phone number is used for WhatsApp integration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/30">
              <Checkbox
                id="attachMode"
                checked={formData.attachMode}
                onCheckedChange={(v) => updateFormData({ ...formData, attachMode: v === true, existingOrderId: '' })}
              />
              <div className="grid gap-1 leading-none">
                <Label htmlFor="attachMode" className="cursor-pointer">
                  Dodaj na postojeću narudžbu (grupna prijava)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Koristi kad više osoba dijeli istu ponudu/fakturu — dodaje se kao nova stavka na postojeću narudžbu umjesto nove narudžbe.
                </p>
              </div>
            </div>

            {formData.attachMode && (
              <div className="space-y-2">
                <Label htmlFor="existingOrder">Narudžba *</Label>
                <Select
                  value={formData.existingOrderId}
                  onValueChange={(v) => updateFormData({ ...formData, existingOrderId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isFetchingOrders ? 'Učitavanje...' : 'Odaberi narudžbu'} />
                  </SelectTrigger>
                  <SelectContent>
                    {existingOrders?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        #{o.order_number} — {o.payer_name} — {(o.total_amount ?? 0).toFixed(2)} EUR
                      </SelectItem>
                    ))}
                    {existingOrders?.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nema otvorenih narudžbi za ovaj event
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedExistingOrder?.bc_quote_number && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">
                      Ova narudžba već ima BC ponudu ({selectedExistingOrder.bc_quote_number}). Dodavanjem polaznika mijenja se iznos u Conwayu, ali BC ponuda se NE regenerira automatski — javi Silviji da zatraži novu verziju ponude.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => updateFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => updateFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+385 91 234 5678"
                value={formData.phone}
                onChange={(e) => updateFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Primary identifier for WhatsApp integration</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => updateFormData({ ...formData, email: e.target.value, billingEmail: formData.billingEmail || e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketTier">Kotizacija *</Label>
              <Select value={formData.ticketTierId} onValueChange={handleTicketTierChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberi kotizaciju" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTiers?.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} — €{tier.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePaid">Cijena (€)</Label>
              <Input
                id="pricePaid"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricePaid}
                onChange={(e) => updateFormData({ ...formData, pricePaid: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Auto-filled from tier, can be adjusted if needed</p>
            </div>

            {!formData.attachMode && (
              <>
                <div className="space-y-2">
                  <Label>Tko plaća</Label>
                  <Select
                    value={formData.payerType}
                    onValueChange={(v: PayerType) => updateFormData({ ...formData, payerType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Fizička osoba</SelectItem>
                      <SelectItem value="company">Tvrtka</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payerName">
                    Naziv platitelja {formData.payerType === 'company' && '*'}
                  </Label>
                  <Input
                    id="payerName"
                    value={formData.payerName}
                    onChange={(e) => updateFormData({ ...formData, payerName: e.target.value })}
                    placeholder={formData.payerType === 'company' ? 'Naziv tvrtke d.o.o.' : ''}
                  />
                </div>

                {formData.payerType === 'company' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyOib">OIB / VAT ID</Label>
                      <Input
                        id="companyOib"
                        value={formData.companyOib}
                        onChange={(e) => updateFormData({ ...formData, companyOib: e.target.value })}
                        placeholder="e.g. 12345678901"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payerAddress">Street Address</Label>
                      <Input
                        id="payerAddress"
                        value={formData.payerAddress}
                        onChange={(e) => updateFormData({ ...formData, payerAddress: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payerCity">City</Label>
                        <Input
                          id="payerCity"
                          value={formData.payerCity}
                          onChange={(e) => updateFormData({ ...formData, payerCity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payerPostalCode">Postal Code</Label>
                        <Input
                          id="payerPostalCode"
                          value={formData.payerPostalCode}
                          onChange={(e) => updateFormData({ ...formData, payerPostalCode: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="poNumber">PO Number (Optional)</Label>
                      <Input
                        id="poNumber"
                        value={formData.poNumber}
                        onChange={(e) => updateFormData({ ...formData, poNumber: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="billingEmail">Email za račun</Label>
                  <Input
                    id="billingEmail"
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => updateFormData({ ...formData, billingEmail: e.target.value })}
                    placeholder={formData.email || 'racuni@primjer.hr'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Način plaćanja</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(v: PaymentMethod) => updateFormData({ ...formData, paymentMethod: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Virman</SelectItem>
                      <SelectItem value="stripe">Kartica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jezik komunikacije</Label>
                  <Select
                    value={formData.lang}
                    onValueChange={(v: Lang) => updateFormData({ ...formData, lang: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hr">Hrvatski</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-2 rounded-md border p-3">
                  <Checkbox
                    id="markPaid"
                    checked={formData.markPaid}
                    onCheckedChange={(v) => updateFormData({ ...formData, markPaid: v === true })}
                  />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor="markPaid" className="cursor-pointer">
                      Uplata zaprimljena — označi kao plaćeno
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ako je označeno, polazniku se automatski šalje ulaznica na email.
                    </p>
                  </div>
                </div>
              </>
            )}

            {formData.attachMode && (
              <p className="text-xs text-muted-foreground border rounded-md p-3 bg-muted/30">
                Platitelj, način plaćanja i status ostaju kao na odabranoj narudžbi. Status plaćanja/ulaznica za pojedinačnog polaznika uređuje se naknadno preko "Uredi polaznika".
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addAttendeeMutation.isPending}>
              {addAttendeeMutation.isPending ? 'Adding...' : 'Add Attendee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
