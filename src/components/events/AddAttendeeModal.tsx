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

interface AddAttendeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

type PayerType = 'individual' | 'company';
type PaymentMethod = 'invoice' | 'stripe';
type Lang = 'hr' | 'en';

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
  };
  const { restoredData, saveDraft, clearDraft } = useStateDraft(`add_attendee_${eventId}`, initialData, { enabled: open });
  const [formData, setFormData] = useState(restoredData);

  const updateFormData = (newData: typeof formData) => {
    setFormData(newData);
    saveDraft(newData);
  };

  // Auto-fill payer name for individuals
  useEffect(() => {
    if (formData.payerType === 'individual') {
      const auto = `${formData.firstName} ${formData.lastName}`.trim();
      if (formData.payerName !== auto) {
        updateFormData({ ...formData, payerName: auto });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.firstName, formData.lastName, formData.payerType]);

  // Fetch ticket tiers
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

      // Step 1: profile lookup by EMAIL / create
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
          // Only fill in fields that are currently empty — never rename an existing profile
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

      // Step 2: duplicate check (keyed off email-matched profile)
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

      // Step 3: selected tier
      const selectedTier = ticketTiers?.find(t => t.id === formData.ticketTierId) || null;
      const pricePaid = formData.pricePaid;

      // Step 4: attendee insert (always approved)
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

      try {
        // Step 5: fetch VAT rate
        const { data: eventRow } = await supabase
          .from('events')
          .select('vat_rate')
          .eq('id', eventId)
          .single();
        const vatRate = Number(eventRow?.vat_rate ?? 25);

        // Step 6: insert order (issued — never 'paid' on insert)
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

        const vatAmount = Number((pricePaid * vatRate / (100 + vatRate)).toFixed(2));

        // Step 7: order_items
        const { error: itemError } = await supabase.from('order_items').insert({
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
        });
        if (itemError) throw itemError;

        // Step 8: optional mark paid (triggers ticket email)
        if (formData.markPaid) {
          const { error: paidError } = await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', newOrder.id);
          if (paidError) throw paidError;
        }

        return { orderNumber: newOrder.order_number, markedPaid: formData.markPaid };
      } catch (err) {
        // Best-effort cleanup
        try {
          await supabase.from('attendees').delete().eq('id', attendeeId);
        } catch {
          // swallow
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-memberships', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-revenue-stats', eventId] });
      if (result?.markedPaid) {
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
    if (formData.payerType === 'company' && !formData.payerName.trim()) {
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
              <Label htmlFor="phone">Phone Number *</Label>
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
              <Label htmlFor="email">Email (Optional)</Label>
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
