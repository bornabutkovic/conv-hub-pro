import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { BrandingSection } from '@/components/events/BrandingSection';
import { PhoneInput } from '@/components/ui/phone-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const LANGUAGE_OPTIONS = [
  { value: 'hr', label: 'HR - Croatian' },
  { value: 'en', label: 'EN - English' },
  { value: 'de', label: 'DE - German' },
];

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100),
  short_name: z.string().max(50).optional(),
  event_type: z.enum(['face2face', 'virtual', 'hybrid'], { required_error: 'Event type is required' }),
  description: z.string().optional(),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  venue_name: z.string().min(1, 'Venue is required').max(200),
  location_address: z.string().max(300).optional(),
  location_city: z.string().min(1, 'City is required').max(100),
  location_postal_code: z.string().max(20).optional(),
  location_country: z.string().min(1, 'Country is required').max(100),
  start_date: z.date({ required_error: 'Start date is required' }),
  start_time: z.string().min(1, 'Start time is required'),
  end_date: z.date({ required_error: 'End date is required' }),
  end_time: z.string().min(1, 'End time is required'),
  payment_due_days: z.coerce.number().min(1, 'Must be at least 1 day').default(7),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  tax_location: z.string().max(100).optional(),
  bc_position: z.string().max(100).optional(),
  bc_reference: z.string().max(100).optional(),
  notification_sender_name: z.string().min(1, 'Sender name is required').max(100),
  notification_sender_email: z.string().email('Please enter a valid email').min(1, 'Sender email is required'),
  support_phone: z.string().max(50).optional(),
  support_contacts: z.string().max(500).optional(),
  additional_admins: z.string().optional(),
  supported_languages: z.array(z.string()).default(['hr']),
  institution_uuid: z.string().optional(),
  status: z.enum(['draft', 'pending_approval', 'active', 'completed']).default('draft'),
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

export default function CreateEvent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [branding, setBranding] = useState({
    branding_primary_color: '#6366f1',
    branding_secondary_color: '#ffffff',
    branding_text_color: '#1f2937',
    branding_logo_url: null as string | null,
    branding_banner_url: null as string | null,
  });
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

  const handleBrandingChange = useCallback((values: typeof branding) => {
    setBranding(values);
  }, []);

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
    enabled: userIsAdmin,
  });

  const form = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: '',
      short_name: '',
      event_type: 'face2face',
      description: '',
      website_url: '',
      venue_name: '',
      location_address: '',
      location_city: '',
      location_postal_code: '',
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
      const [startHours, startMinutes] = data.start_time.split(':').map(Number);
      const startDateTime = new Date(data.start_date);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const [endHours, endMinutes] = data.end_time.split(':').map(Number);
      const endDateTime = new Date(data.end_date);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const additionalAdminsArray = data.additional_admins
        ? data.additional_admins.split(',').map(email => email.trim()).filter(Boolean)
        : null;

      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          name: data.name,
          short_name: data.short_name || null,
          event_type: data.event_type,
          website_url: data.website_url || null,
          venue_name: data.venue_name,
          location_address: (data as any).location_address || null,
          location_city: data.location_city,
          location_country: data.location_country,
          location_postal_code: data.location_postal_code || null,
          slug: generateSlug(data.name),
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
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
          branding_primary_color: branding.branding_primary_color,
          branding_secondary_color: branding.branding_secondary_color,
          branding_text_color: branding.branding_text_color,
          branding_logo_url: branding.branding_logo_url,
          branding_banner_url: branding.branding_banner_url,
        })
        .select('id')
        .single();

      if (eventError) throw eventError;

      const { error: membershipError } = await supabase
        .from('event_memberships')
        .insert({
          event_id: newEvent.id,
          user_id: profile.id,
          role: 'organizer_admin',
        });

      if (membershipError) {
        console.warn('Membership assignment skipped:', membershipError);
      }

      toast.success('Event created successfully!');

      navigate(`/events/${newEvent.id}`);
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/events')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <div className="max-w-[720px] mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create New Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Event Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Event Details</h3>
                    <p className="text-sm text-muted-foreground">Basic information about your event</p>
                  </div>
                  <Separator />

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
                        <FormLabel>Short Name</FormLabel>
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
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type / Vrsta eventa *</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { value: 'face2face', label: 'Face2Face', icon: '🏢' },
                              { value: 'virtual', label: 'Virtual', icon: '💻' },
                              { value: 'hybrid', label: 'Hybrid', icon: '🔀' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => field.onChange(option.value)}
                                className={cn(
                                  'flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors',
                                  field.value === option.value
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                                )}
                              >
                                <span className="text-xl">{option.icon}</span>
                                {option.label}
                              </button>
                            ))}
                          </div>
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
                        <FormLabel>Venue *</FormLabel>
                        <FormControl>
                          <Input placeholder="Hotel Westin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('event_type') !== 'virtual' && (
                    <FormField
                      control={form.control}
                      name="location_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Address / Adresa mjesta {form.watch('event_type') === 'face2face' ? '*' : ''}</FormLabel>
                          <FormControl>
                            <Input placeholder="Ilica 1 / Street and number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Zagreb" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location_postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP / Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="10000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Croatia">Croatia</SelectItem>
                            <SelectItem value="Slovenia">Slovenia</SelectItem>
                            <SelectItem value="Serbia">Serbia</SelectItem>
                            <SelectItem value="Bosnia and Herzegovina">Bosnia and Herzegovina</SelectItem>
                            <SelectItem value="Montenegro">Montenegro</SelectItem>
                            <SelectItem value="North Macedonia">North Macedonia</SelectItem>
                            <SelectItem value="Kosovo">Kosovo</SelectItem>
                            <SelectItem value="Germany">Germany</SelectItem>
                            <SelectItem value="Austria">Austria</SelectItem>
                            <SelectItem value="Switzerland">Switzerland</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 3: Dates & Billing */}
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
                                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                    name="payment_due_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Due Days *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="7" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of days a bank-transfer reservation remains valid
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 4: Financials & Settings */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Financials & Settings</h3>
                    <p className="text-sm text-muted-foreground">Financial configuration and Business Central integration</p>
                  </div>
                  <Separator />

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
                          <FormLabel>Tax Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tax location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Croatia">Croatia</SelectItem>
                              <SelectItem value="EU">EU</SelectItem>
                              <SelectItem value="Outside EU">Outside EU</SelectItem>
                            </SelectContent>
                          </Select>
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

                  <div className="pt-2">
                    <p className="text-sm font-medium text-foreground mb-3">Notifications & Support</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="notification_sender_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sender Name *</FormLabel>
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
                          <FormLabel>Sender Email *</FormLabel>
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
                        <FormLabel>Support Phone</FormLabel>
                        <FormControl>
                          <PhoneInput value={field.value} onChange={field.onChange} />
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

                <BrandingSection
                  values={branding}
                  onChange={handleBrandingChange}
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate('/events')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Event
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
