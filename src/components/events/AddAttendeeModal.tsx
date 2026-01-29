import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type RegistrationStatus = Database['public']['Enums']['registration_status'];

interface TicketTier {
  id: string;
  name: string;
  price: number;
}

interface AddAttendeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function AddAttendeeModal({ open, onOpenChange, eventId }: AddAttendeeModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    status: 'pending' as RegistrationStatus,
    ticketTierId: '',
    pricePaid: 0,
  });

  // Fetch ticket tiers for this event
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

  const handleTicketTierChange = (tierId: string) => {
    const tier = ticketTiers?.find(t => t.id === tierId);
    setFormData({
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

      // Step 1: Check if profile with this phone exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      let profileId: string;

      if (existingProfile) {
        // Profile exists - use their ID and optionally update name/email
        profileId = existingProfile.id;
        
        // Update profile with new data if provided
        const updateData: Record<string, string> = {};
        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (email) updateData.email = email;

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profileId);
        }
      } else {
        // Create new profile with role 'attendee'
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            email: email,
            role: 'attendee',
          })
          .select('id')
          .single();

        if (profileError) throw profileError;
        profileId = newProfile.id;
      }

      // Step 2: Check if attendee already exists for this event
      const { data: existingAttendee } = await supabase
        .from('attendees')
        .select('id')
        .eq('event_id', eventId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existingAttendee) {
        throw new Error('User is already registered for this event.');
      }

      // Step 3: Insert new attendee record
      const { error: attendeeError } = await supabase
        .from('attendees')
        .insert({
          event_id: eventId,
          profile_id: profileId,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: email,
          status: formData.status,
        });

      if (attendeeError) throw attendeeError;

      // Step 4: Create event_membership with ticket tier and price_paid
      if (formData.ticketTierId) {
        const { error: membershipError } = await supabase
          .from('event_memberships')
          .insert({
            event_id: eventId,
            user_id: profileId,
            ticket_tier_id: formData.ticketTierId,
            price_paid: formData.pricePaid,
            payment_status: 'pending',
            role: 'attendee',
          });

        if (membershipError) throw membershipError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-memberships', eventId] });
      toast.success('Attendee added successfully');
      onOpenChange(false);
      setFormData({ 
        firstName: '', 
        lastName: '', 
        phone: '', 
        email: '', 
        status: 'pending',
        ticketTierId: '',
        pricePaid: 0,
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add attendee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error('Last name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    
    addAttendeeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Primary identifier for WhatsApp integration
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketTier">Ticket Tier</Label>
              <Select
                value={formData.ticketTierId}
                onValueChange={handleTicketTierChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ticket tier" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTiers?.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} - €{tier.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePaid">Price Paid (€)</Label>
              <Input
                id="pricePaid"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricePaid}
                onChange={(e) => setFormData({ ...formData, pricePaid: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from tier, can be adjusted if needed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: RegistrationStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Registered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
