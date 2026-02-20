import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';

const LANGUAGE_OPTIONS = [
  { value: 'hr', label: 'HR - Hrvatski' },
  { value: 'en', label: 'EN - English' },
  { value: 'de', label: 'DE - Deutsch' },
];

const createEventSchema = z.object({
  // Section 1: Event Details
  name: z.string().min(1, 'Event name is required').max(100),
  short_name: z.string().max(50).optional(),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  
  // Section 2: Location
  venue_name: z.string().min(1, 'Venue is required').max(200),
  location_city: z.string().min(1, 'City is required').max(100),
  location_country: z.string().min(1, 'Country is required').max(100),
  
  // Section 3: Dates & Billing
  start_date: z.date({ required_error: 'Start date is required' }),
  start_time: z.string().min(1, 'Start time is required'),
  end_date: z.date({ required_error: 'End date is required' }),
  end_time: z.string().min(1, 'End time is required'),
  early_bird_deadline: z.date().optional(),
  payment_due_days: z.coerce.number().min(1, 'Must be at least 1 day').default(7),
  
  // Section 4: Financials & Business Central
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  tax_location: z.string().max(100).optional(),
  bc_position: z.string().max(100).optional(),
  bc_reference: z.string().max(100).optional(),
  
  // Section 5: Notifications & Support
  notification_sender_name: z.string().min(1, 'Sender name is required').max(100),
  notification_sender_email: z.string().email('Please enter a valid email').min(1, 'Sender email is required'),
  support_phone: z.string().max(50).optional(),
  support_contacts: z.string().max(500).optional(),
  
  // Section 6: Administration
  additional_admins: z.string().optional(),
  supported_languages: z.array(z.string()).default(['hr']),
  institution_uuid: z.string().optional(),
  
  // Additional fields
  status: z.enum(['draft', 'pending_approval', 'published', 'active']).default('draft'),
}).refine((data) => {
  const startDateTime = new Date(data.start_date);
  const [startHours, startMinutes] = data.start_time.split(':').map(Number);
  startDateTime.setHours(startHours, startMinutes, 0, 0);
  
  const endDateTime = new Date(data.end_date);
  const [endHours, endMinutes] = data.end_time.split(':').map(Number);
  endDateTime.setHours(endHours, endMinutes, 0, 0);
  
  return endDateTime > startDateTime;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type CreateEventForm = z.infer<typeof createEventSchema>;

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
}

export function CreateEventModal({
  open,
  onOpenChange,
  onEventCreated,
}: CreateEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

  // Fetch institutions for admin users to select from
  const { data: institutions } = useQuery({
    queryKey: ['institutions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: userIsAdmin && open,
  });

  const form = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: '',
      short_name: '',
      website_url: '',
      venue_name: '',
      location_city: '',
      location_country: '',
      start_time: '09:00',
      end_time: '18:00',
      payment_due_days: 7,
      currency: 'EUR',
      tax_location: '',
      bc_position: '',
      bc_reference: '',
      notification_sender_name: '',
      notification_sender_email: '',
      support_phone: '',
      support_contacts: '',
      additional_admins: '',
      supported_languages: ['hr'],
      status: 'draft',
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const onSubmit = async (data: CreateEventForm) => {
    // Resolve institution: admin selects from dropdown, organizer uses own
    const resolvedInstitutionUuid = userIsAdmin
      ? data.institution_uuid || null
      : profile?.institution_uuid || null;

    if (!resolvedInstitutionUuid) {
      toast.error('Please select an institution for this event');
      return;
    }

    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine start date and time
      const [startHours, startMinutes] = data.start_time.split(':').map(Number);
      const startDateTime = new Date(data.start_date);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      // Combine end date and time
      const [endHours, endMinutes] = data.end_time.split(':').map(Number);
      const endDateTime = new Date(data.end_date);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Parse additional admins (comma-separated emails to array)
      const additionalAdminsArray = data.additional_admins
        ? data.additional_admins.split(',').map(email => email.trim()).filter(Boolean)
        : null;

      // Step 1: Create the event
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          name: data.name,
          short_name: data.short_name || null,
          website_url: data.website_url || null,
          venue_name: data.venue_name,
          location_city: data.location_city,
          location_country: data.location_country,
          slug: generateSlug(data.name),
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          early_bird_deadline: data.early_bird_deadline?.toISOString() || null,
          payment_due_days: data.payment_due_days,
          currency: data.currency,
          tax_location: data.tax_location || null,
          bc_position: data.bc_position || null,
          bc_reference: data.bc_reference || null,
          notification_sender_name: data.notification_sender_name,
          notification_sender_email: data.notification_sender_email,
          support_phone: data.support_phone || null,
          additional_admins: additionalAdminsArray,
          supported_languages: data.supported_languages,
          status: data.status,
          institution_uuid: resolvedInstitutionUuid,
        })
        .select('id')
        .single();

      if (eventError) throw eventError;

      // Step 2: Create event_membership for the creator
      const { error: membershipError } = await supabase
        .from('event_memberships')
        .insert({
          event_id: newEvent.id,
          user_id: profile.id,
          role: 'organizer_admin',
        });

      if (membershipError) {
        console.error('Error creating event membership:', membershipError);
        // Don't fail the entire operation, event was created successfully
        toast.warning('Event created, but membership assignment failed');
      } else {
        toast.success('Event created successfully!');
      }

      form.reset();
      onOpenChange(false);
      onEventCreated();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">Create New Event</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
              {/* Section 1: Event Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Event Details</h3>
                  <p className="text-sm text-muted-foreground">Basic information about your event</p>
                </div>
                <Separator />

                {/* Institution selector for admins */}
                {userIsAdmin && (
                  <FormField
                    control={form.control}
                    name="institution_uuid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an institution" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {institutions?.map((inst) => (
                              <SelectItem key={inst.id!} value={inst.id!}>
                                {inst.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Choose which institution owns this event</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="My Conference 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="short_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skraćeno ime događaja</FormLabel>
                      <FormControl>
                        <Input placeholder="CONF2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Web stranica</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 2: Location */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Location</h3>
                  <p className="text-sm text-muted-foreground">Where will the event take place?</p>
                </div>
                <Separator />

                <FormField
                  control={form.control}
                  name="venue_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokacija *</FormLabel>
                      <FormControl>
                        <Input placeholder="Hotel Westin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad *</FormLabel>
                        <FormControl>
                          <Input placeholder="Zagreb" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Država *</FormLabel>
                        <FormControl>
                          <Input placeholder="Hrvatska" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Dates & Billing Settings */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Dates & Billing Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure event timing and payment terms</p>
                </div>
                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const startDate = form.getValues('start_date');
                                return startDate ? date < startDate : date < new Date();
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="early_bird_deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Early bird rokovi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a deadline</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_due_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rok isteka ponuda – dana *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="7"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Koliko dana vrijedi rezervacija za virmansko plaćanje
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status is always 'draft' for new events - no selector needed */}
              </div>

              {/* Section 4: Financials & Settings */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Financials & Settings</h3>
                  <p className="text-sm text-muted-foreground">Financial configuration and Business Central integration</p>
                </div>
                <Separator />

                {/* Financials & Business Central */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porezna lokacija</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Croatia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {userIsAdmin && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bc_position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Central Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Position reference" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bc_reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Central Referent</FormLabel>
                        <FormControl>
                          <Input placeholder="Referent name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                )}

                {/* Notifications & Support */}
                <div className="pt-2">
                  <p className="text-sm font-medium text-foreground mb-3">Notifications & Support</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="notification_sender_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pošiljatelj ime *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Ivan Horvat" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notification_sender_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pošiljatelj mail *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="support_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kontakt mobitel</FormLabel>
                      <FormControl>
                        <Input placeholder="+385 91 234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="support_contacts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Contacts</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional support contact information..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Administration */}
                <div className="pt-2">
                  <p className="text-sm font-medium text-foreground mb-3">Administration</p>
                </div>

                <FormField
                  control={form.control}
                  name="additional_admins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Admins</FormLabel>
                      <FormControl>
                        <Input placeholder="admin1@email.com, admin2@email.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter multiple emails separated by commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supported_languages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Languages</FormLabel>
                      <div className="flex flex-wrap gap-4 pt-2">
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <div key={lang.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`lang-${lang.value}`}
                              checked={field.value?.includes(lang.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...(field.value || []), lang.value]);
                                } else {
                                  field.onChange(
                                    field.value?.filter((v) => v !== lang.value) || []
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`lang-${lang.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {lang.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Event
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
