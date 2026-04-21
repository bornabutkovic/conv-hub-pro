import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { DateRangePickers } from '@/components/ui/date-range-pickers';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import { toast } from 'sonner';
import { BrandingSection } from '@/components/events/BrandingSection';
import { PhoneInput } from '@/components/ui/phone-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { OrganizersSection } from '@/components/events/OrganizersSection';
import { ContentSection } from '@/components/events/ContentSection';
import { LanguagesField } from '@/components/events/LanguagesField';

const LANGUAGE_OPTIONS = [
  { value: 'hr', label: 'HR - Croatian' },
  { value: 'en', label: 'EN - English' },
  { value: 'de', label: 'DE - German' },
];

const editEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100),
  short_name: z.string().max(50).optional(),
  event_type: z.enum(['face2face', 'virtual', 'hybrid'], { required_error: 'Event type is required' }),
  description: z.string().optional(),
  cancellation_policy: z.string().optional(),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  venue_name: z.string().min(1, 'Venue is required').max(200),
  location_address: z.string().max(300).optional(),
  location_city: z.string().min(1, 'City is required').max(100),
  location_postal_code: z.string().max(20).optional(),
  location_country: z.string().min(1, 'Country is required').max(100),
  start_date: z.date({ required_error: 'Start date is required' }),
  start_time: z.string().optional(),
  end_date: z.date({ required_error: 'End date is required' }),
  end_time: z.string().optional(),
  payment_due_days: z.coerce.number().min(1, 'Must be at least 1 day').default(7),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  tax_location: z.string().max(100).optional(),
  bc_position: z.string().max(100).optional(),
  bc_reference: z.string().max(100).optional(),
  notification_sender_name: z.string().min(1, 'Sender name is required').max(100),
  notification_sender_email: z.string().email('Please enter a valid email').min(1, 'Sender email is required'),
  support_phone: z.string().max(50).optional(),
  additional_admins: z.string().optional(),
  supported_languages: z.array(z.string()).default(['hr']),
  status: z.enum(['draft', 'pending_approval', 'active', 'completed']),
}).refine((data) => {
  const startDateTime = new Date(data.start_date);
  if (data.start_time) {
    const [sh, sm] = data.start_time.split(':').map(Number);
    startDateTime.setHours(sh, sm, 0, 0);
  } else {
    startDateTime.setHours(0, 0, 0, 0);
  }
  const endDateTime = new Date(data.end_date);
  if (data.end_time) {
    const [eh, em] = data.end_time.split(':').map(Number);
    endDateTime.setHours(eh, em, 0, 0);
  } else {
    endDateTime.setHours(23, 59, 0, 0);
  }
  return endDateTime > startDateTime;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type EditEventForm = z.infer<typeof editEventSchema>;

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

  const [branding, setBranding] = useState({
    branding_primary_color: '#6366f1',
    branding_secondary_color: '#ffffff',
    branding_text_color: '#1f2937',
    branding_logo_url: null as string | null,
    branding_banner_url: null as string | null,
  });

  const [enTranslations, setEnTranslations] = useState({
    name: '',
    description: '',
    cancellation_policy: '',
    auto_translated: false,
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const form = useForm<EditEventForm>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      name: '',
      short_name: '',
      event_type: 'face2face',
      description: '',
      cancellation_policy: '',
      website_url: '',
      venue_name: '',
      location_address: '',
      location_city: '',
      location_postal_code: '',
      location_country: '',
      start_time: '',
      end_time: '',
      payment_due_days: 7,
      currency: 'EUR',
      tax_location: '',
      bc_position: '',
      bc_reference: '',
      notification_sender_name: '',
      notification_sender_email: '',
      support_phone: '',
      additional_admins: '',
      supported_languages: ['hr'],
      status: 'draft',
    },
  });

  useEffect(() => {
    if (event) {
      const startDate = event.start_date ? new Date(event.start_date) : new Date();
      const sH = startDate.getHours();
      const sM = startDate.getMinutes();
      const startTimeStr = (sH === 0 && sM === 0)
        ? ''
        : `${sH.toString().padStart(2, '0')}:${sM.toString().padStart(2, '0')}`;
      const endDate = event.end_date ? new Date(event.end_date) : new Date();
      const eH = endDate.getHours();
      const eM = endDate.getMinutes();
      const endTimeStr = (eH === 23 && eM === 59)
        ? ''
        : `${eH.toString().padStart(2, '0')}:${eM.toString().padStart(2, '0')}`;
      const additionalAdminsStr = event.additional_admins
        ? event.additional_admins.join(', ')
        : '';

      form.reset({
        name: event.name || '',
        short_name: event.short_name || '',
        event_type: ((event as any).event_type as 'face2face' | 'virtual' | 'hybrid') || 'face2face',
        description: event.description || '',
        cancellation_policy: event.cancellation_policy || '',
        website_url: event.website_url || '',
        venue_name: event.venue_name || '',
        location_address: (event as any).location_address || '',
        location_city: event.location_city || '',
        location_postal_code: (event as any).location_postal_code || '',
        location_country: event.location_country || '',
        start_date: startDate,
        start_time: startTimeStr,
        end_date: endDate,
        end_time: endTimeStr,
        payment_due_days: event.payment_due_days || 7,
        currency: (event.currency as 'EUR' | 'USD') || 'EUR',
        tax_location: event.tax_location || '',
        bc_position: event.bc_position || '',
        bc_reference: event.bc_reference || '',
        notification_sender_name: event.notification_sender_name || '',
        notification_sender_email: event.notification_sender_email || '',
        support_phone: event.support_phone || '',
        additional_admins: additionalAdminsStr,
        supported_languages: event.supported_languages || ['hr'],
        status: (event.status as 'draft' | 'pending_approval' | 'active' | 'completed') || 'draft',
      });

      setBranding({
        branding_primary_color: event.branding_primary_color || '#6366f1',
        branding_secondary_color: event.branding_secondary_color || '#ffffff',
        branding_text_color: event.branding_text_color || '#1f2937',
        branding_logo_url: event.branding_logo_url || null,
        branding_banner_url: event.branding_banner_url || null,
      });

      const trans = (event.translations as any)?.en || {};
      setEnTranslations({
        name: trans.name || '',
        description: trans.description || '',
        cancellation_policy: trans.cancellation_policy || '',
        auto_translated: !!trans.auto_translated,
      });
    }
  }, [event, form]);

  // Check if event has sold tickets (paid attendees)
  const { data: paidAttendeesCount = 0 } = useQuery({
    queryKey: ['edit-event-paid-attendees', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id!)
        .eq('payment_status', 'paid');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const isLockedEvent = event?.status === 'active' && paidAttendeesCount > 0;

  // ERP Code section data
  const { data: ticketTiers, refetch: refetchTiers } = useQuery({
    queryKey: ['edit-event-tiers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('id, name, erp_code')
        .eq('event_id', id!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && userIsAdmin,
  });

  const { data: eventServices, refetch: refetchServices } = useQuery({
    queryKey: ['edit-event-services', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_services')
        .select('id, name, erp_code')
        .eq('event_id', id!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && userIsAdmin,
  });

  const [tierErpCodes, setTierErpCodes] = useState<Record<string, string>>({});
  const [serviceErpCodes, setServiceErpCodes] = useState<Record<string, string>>({});
  const [savingTiers, setSavingTiers] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  useEffect(() => {
    if (ticketTiers) {
      const map: Record<string, string> = {};
      ticketTiers.forEach((t) => { map[t.id] = t.erp_code || ''; });
      setTierErpCodes(map);
    }
  }, [ticketTiers]);

  useEffect(() => {
    if (eventServices) {
      const map: Record<string, string> = {};
      eventServices.forEach((s) => { map[s.id] = s.erp_code || ''; });
      setServiceErpCodes(map);
    }
  }, [eventServices]);

  const saveTierErpCodes = async () => {
    setSavingTiers(true);
    try {
      const updates = Object.entries(tierErpCodes).map(([tid, erp_code]) =>
        supabase.from('ticket_tiers').update({ erp_code: erp_code || null }).eq('id', tid)
      );
      await Promise.all(updates);
      toast.success('Ticket tier ERP codes saved');
      refetchTiers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save ERP codes');
    } finally {
      setSavingTiers(false);
    }
  };

  const saveServiceErpCodes = async () => {
    setSavingServices(true);
    try {
      const updates = Object.entries(serviceErpCodes).map(([sid, erp_code]) =>
        supabase.from('event_services').update({ erp_code: erp_code || null }).eq('id', sid)
      );
      await Promise.all(updates);
      toast.success('Service ERP codes saved');
      refetchServices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save ERP codes');
    } finally {
      setSavingServices(false);
    }
  };

  const onSubmit = async (data: EditEventForm) => {
    if (!event) return;
    setIsSubmitting(true);

    try {
      const startDateTime = new Date(data.start_date);
      if (data.start_time) {
        const [sh, sm] = data.start_time.split(':').map(Number);
        startDateTime.setHours(sh, sm, 0, 0);
      } else {
        startDateTime.setHours(0, 0, 0, 0);
      }

      const endDateTime = new Date(data.end_date);
      if (data.end_time) {
        const [eh, em] = data.end_time.split(':').map(Number);
        endDateTime.setHours(eh, em, 0, 0);
      } else {
        endDateTime.setHours(23, 59, 0, 0);
      }

      const additionalAdminsArray = data.additional_admins
        ? data.additional_admins.split(',').map(email => email.trim()).filter(Boolean)
        : null;

      const { error } = await supabase
        .from('events')
        .update({
          name: data.name,
          short_name: data.short_name || null,
          event_type: (data as any).event_type,
          description: data.description || null,
          cancellation_policy: (data as any).cancellation_policy || null,
          website_url: data.website_url || null,
          venue_name: data.venue_name,
          location_address: (data as any).location_address || null,
          location_city: data.location_city,
          location_country: data.location_country,
          location_postal_code: data.location_postal_code || null,
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
          translations: {
            ...((event.translations as any) || {}),
            en: {
              ...(((event.translations as any) || {}).en || {}),
              name: enTranslations.name || undefined,
              description: enTranslations.description || undefined,
              cancellation_policy: enTranslations.cancellation_policy || undefined,
              auto_translated: enTranslations.auto_translated,
            },
          },
          branding_primary_color: branding.branding_primary_color,
          branding_secondary_color: branding.branding_secondary_color,
          branding_text_color: branding.branding_text_color,
          branding_logo_url: branding.branding_logo_url,
          branding_banner_url: branding.branding_banner_url,
        })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Event updated successfully!');
      navigate(`/events/${event.id}`);
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast.error(error.message || 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="link" onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }

  const hasTiers = ticketTiers && ticketTiers.length > 0;
  const hasServices = eventServices && eventServices.length > 0;
  const showErpSection = userIsAdmin && event.status === 'pending_approval' && (hasTiers || hasServices);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/events/${event.id}`)} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Event
      </Button>

      <div className="max-w-[720px] mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Edit Event</CardTitle>
          </CardHeader>
          <CardContent>
            {isLockedEvent && (
              <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  ⚠️ Some fields are locked because tickets have already been sold. You can still update description, branding, support info, and ticket tier availability.
                </AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Event Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Event Details</h3>
                    <p className="text-sm text-muted-foreground">Basic information about your event</p>
                  </div>
                  <Separator />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="My Conference 2026" {...field} disabled={isLockedEvent} />
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
                                disabled={isLockedEvent}
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

                {/* About / Description */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">About the Event / O eventu</h3>
                    <p className="text-sm text-muted-foreground">Describe your event for attendees</p>
                  </div>
                  <Separator />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultilingualContentField
                            supportedLanguages={form.watch('supported_languages') || ['hr']}
                            label="Description / Opis"
                            renderEditor={(lang) =>
                              lang === 'hr' ? (
                                <RichTextEditor
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  placeholder="Tell attendees about this event..."
                                />
                              ) : lang === 'en' ? (
                                <RichTextEditor
                                  value={enTranslations.description}
                                  onChange={(v) =>
                                    setEnTranslations((prev) => ({ ...prev, description: v, auto_translated: false }))
                                  }
                                  placeholder="Tell attendees about this event in English..."
                                />
                              ) : null
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cancellation_policy"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MultilingualContentField
                            supportedLanguages={form.watch('supported_languages') || ['hr']}
                            label="Cancellation Policy / Politika povrata"
                            renderEditor={(lang) =>
                              lang === 'hr' ? (
                                <Textarea
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  placeholder="Describe your cancellation and refund policy..."
                                  className="min-h-[120px]"
                                />
                              ) : lang === 'en' ? (
                                <Textarea
                                  value={enTranslations.cancellation_policy}
                                  onChange={(e) =>
                                    setEnTranslations((prev) => ({
                                      ...prev,
                                      cancellation_policy: e.target.value,
                                      auto_translated: false,
                                    }))
                                  }
                                  placeholder="Describe your cancellation and refund policy in English..."
                                  className="min-h-[120px]"
                                />
                              ) : null
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Name translation (kept separate because Event Name lives in Event Details above) */}
                {(form.watch('supported_languages') || []).includes('en') && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Name Translation</h3>
                      <p className="text-sm text-muted-foreground">English version of the event name</p>
                    </div>
                    <Separator />
                    <TranslatableFields
                      fields="name"
                      hrName={form.watch('name')}
                      enName={enTranslations.name}
                      autoTranslated={enTranslations.auto_translated}
                      onEnNameChange={(v) =>
                        setEnTranslations((prev) => ({ ...prev, name: v, auto_translated: false }))
                      }
                      translateType="event"
                      translateId={event.id}
                      onTranslated={() => {
                        queryClient.invalidateQueries({ queryKey: ['event', id] });
                      }}
                    />
                  </div>
                )}

                {/* Co-organizers / Technical organizer */}
                <OrganizersSection
                  eventId={event.id}
                  primaryInstitutionId={event.institution_uuid}
                />

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
                          <Input placeholder="Hotel Westin" {...field} disabled={isLockedEvent} />
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
                            <Input placeholder="Ilica 1 / Street and number" {...field} disabled={isLockedEvent} />
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
                            <Input placeholder="Zagreb" {...field} disabled={isLockedEvent} />
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLockedEvent}>
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

                  <DateRangePickers form={form} startName="start_date" endName="end_date" startLabel="Start Date *" endLabel="End Date *" disabled={isLockedEvent} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} disabled={isLockedEvent} />
                          </FormControl>
                          <FormDescription>Nije obavezno / Optional</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} disabled={isLockedEvent} />
                          </FormControl>
                          <FormDescription>Nije obavezno / Optional</FormDescription>
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

                  {userIsAdmin ? (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="pending_approval">Pending Approval</SelectItem>
                              <SelectItem value="active">Active (Published)</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Status: <span className="font-medium capitalize">{form.getValues('status')?.replace('_', ' ')}</span>
                    </div>
                  )}
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                                id={`edit-lang-${lang.value}`}
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
                                htmlFor={`edit-lang-${lang.value}`}
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

                {/* Branding Section */}
                <BrandingSection
                  eventId={event.id}
                  values={branding}
                  onChange={setBranding}
                />

                {/* ERP Code Section - Admin only, visible for pending_approval events */}
                {showErpSection && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">ERP Codes (Admin)</h3>
                      <p className="text-sm text-muted-foreground">Assign ERP codes before approving this event</p>
                    </div>
                    <Separator />

                    {hasTiers && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Ticket Tiers</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={saveTierErpCodes}
                            disabled={savingTiers}
                          >
                            {savingTiers ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                            Save
                          </Button>
                        </div>
                        {ticketTiers!.map((tier) => (
                          <div key={tier.id} className="grid grid-cols-2 gap-3 items-center">
                            <span className="text-sm text-muted-foreground truncate">{tier.name}</span>
                            <Input
                              placeholder="ERP Code"
                              value={tierErpCodes[tier.id] || ''}
                              onChange={(e) =>
                                setTierErpCodes((prev) => ({ ...prev, [tier.id]: e.target.value }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {hasServices && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Services</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={saveServiceErpCodes}
                            disabled={savingServices}
                          >
                            {savingServices ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                            Save
                          </Button>
                        </div>
                        {eventServices!.map((svc) => (
                          <div key={svc.id} className="grid grid-cols-2 gap-3 items-center">
                            <span className="text-sm text-muted-foreground truncate">{svc.name}</span>
                            <Input
                              placeholder="ERP Code"
                              value={serviceErpCodes[svc.id] || ''}
                              onChange={(e) =>
                                setServiceErpCodes((prev) => ({ ...prev, [svc.id]: e.target.value }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate(`/events/${event.id}`)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
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
