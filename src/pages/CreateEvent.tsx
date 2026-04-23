import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, ArrowLeft, Info } from 'lucide-react';
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
import { OrganizersInlineEditor, type OrganizersInfo } from '@/components/events/OrganizersInlineEditor';
import { ContentSection } from '@/components/events/ContentSection';
import { LanguagesField } from '@/components/events/LanguagesField';
import { BCReferenceField } from '@/components/events/BCReferenceField';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

const LANGUAGE_OPTIONS = [
  { value: 'hr', label: 'HR - Croatian' },
  { value: 'en', label: 'EN - English' },
];

const createEventSchema = z.object({
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
  support_contacts: z.string().max(500).optional(),
  additional_admins: z.string().optional(),
  supported_languages: z.array(z.string()).default(['hr']),
  institution_uuid: z.string().optional(),
  status: z.enum(['draft', 'pending_approval', 'active', 'completed']).default('draft'),
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

type CreateEventForm = z.infer<typeof createEventSchema>;

export default function CreateEvent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useAdminLanguage();
  const [enTranslations, setEnTranslations] = useState({
    name: '',
    description: '',
    cancellation_policy: '',
  });
  const [organizersInfo, setOrganizersInfo] = useState<OrganizersInfo>({
    co_organizers: [],
    technical_organizer: null,
  });
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
      support_contacts: '',
      additional_admins: '',
      supported_languages: ['hr'],
      status: 'draft',
    },
  });

  const { clearDraft } = useFormDraft(form, 'create_event');

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
      toast.error(t('editEvent.selectInstitutionFirst'));
      return;
    }

    if (!profile?.id) {
      toast.error(t('editEvent.profileNotFound'));
      return;
    }

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

      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          name: data.name,
          short_name: data.short_name || null,
          event_type: data.event_type,
          description: data.description || null,
          cancellation_policy: (data as any).cancellation_policy || null,
          translations: {
            en: {
              name: enTranslations.name || undefined,
              description: enTranslations.description || undefined,
              cancellation_policy: enTranslations.cancellation_policy || undefined,
            },
          },
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
          organizers_info: (organizersInfo.co_organizers.length > 0 || organizersInfo.technical_organizer)
            ? (organizersInfo as any)
            : {},
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

      clearDraft();
      toast.success(t('editEvent.createdSuccess'));

      navigate(`/events/${newEvent.id}`);
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || t('editEvent.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/events')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('editEvent.backToEvents')}
      </Button>

      <div className="max-w-[720px] mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('editEvent.createTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Languages — first field */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supported_languages"
                    render={({ field }) => (
                      <LanguagesField
                        value={field.value || ['hr']}
                        onChange={field.onChange}
                        idPrefix="create-lang"
                      />
                    )}
                  />
                </div>

                {/* Section 1: Event Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t('editEvent.sectionDetails')}</h3>
                    <p className="text-sm text-muted-foreground">{t('editEvent.sectionDetailsDesc')}</p>
                  </div>
                  <Separator />

                  {userIsAdmin && (
                    <FormField
                      control={form.control}
                      name="institution_uuid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editEvent.institution')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('editEvent.selectInstitution')} />
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
                          <FormDescription>{t('editEvent.institutionDesc')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="short_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('editEvent.shortName')}</FormLabel>
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
                        <FormLabel>{t('editEvent.website')}</FormLabel>
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
                        <FormLabel>{t('editEvent.eventType')}</FormLabel>
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

                {/* Sadržaj / Content — unified HR/EN switcher containing name, description, cancellation policy */}
                <ContentSection
                  supportedLanguages={form.watch('supported_languages') || ['hr']}
                  renderForLanguage={(lang) =>
                    lang === 'hr' ? (
                      <>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Naziv eventa (HR) *</FormLabel>
                              <FormControl>
                                <Input placeholder="Moja konferencija 2026" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opis eventa (HR)</FormLabel>
                              <FormControl>
                                <RichTextEditor
                                  key="description-hr"
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  placeholder="Recite posjetiteljima više o eventu..."
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
                              <FormLabel>Politika otkazivanja (HR)</FormLabel>
                              <FormControl>
                                <Textarea
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  placeholder="Opišite politiku otkazivanja i povrata..."
                                  className="min-h-[120px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : lang === 'en' ? (
                      <>
                        <FormItem>
                          <FormLabel>{t('editEvent.eventNameEn')}</FormLabel>
                          <FormControl>
                            <Input
                              value={enTranslations.name}
                              onChange={(e) =>
                                setEnTranslations((prev) => ({ ...prev, name: e.target.value }))
                              }
                              placeholder={t('editEvent.leaveEmptyName')}
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormLabel>{t('editEvent.eventDescEn')}</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              key="description-en"
                              value={enTranslations.description}
                              onChange={(v) =>
                                setEnTranslations((prev) => ({ ...prev, description: v }))
                              }
                              placeholder={t('editEvent.leaveEmptyDesc')}
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormLabel>{t('editEvent.cancellationPolicyEn')}</FormLabel>
                          <FormControl>
                            <Textarea
                              value={enTranslations.cancellation_policy}
                              onChange={(e) =>
                                setEnTranslations((prev) => ({
                                  ...prev,
                                  cancellation_policy: e.target.value,
                                }))
                              }
                              placeholder={t('editEvent.leaveEmptyPolicy')}
                              className="min-h-[120px]"
                            />
                          </FormControl>
                        </FormItem>
                      </>
                    ) : null
                  }
                />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t('editEvent.sectionLocation')}</h3>
                    <p className="text-sm text-muted-foreground">{t('editEvent.sectionLocationDesc')}</p>
                  </div>
                  <Separator />

                  <FormField
                    control={form.control}
                    name="venue_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('editEvent.venue')}</FormLabel>
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
                          <FormLabel>{t('editEvent.venueAddress')} {form.watch('event_type') === 'face2face' ? '*' : ''}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('editEvent.venueAddressPlaceholder')} {...field} />
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
                          <FormLabel>{t('editEvent.city')}</FormLabel>
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
                          <FormLabel>{t('editEvent.postalCode')}</FormLabel>
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
                        <FormLabel>{t('editEvent.country')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('editEvent.selectCountry')} />
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
                    <h3 className="text-sm font-semibold text-foreground">{t('editEvent.sectionDates')}</h3>
                    <p className="text-sm text-muted-foreground">{t('editEvent.sectionDatesDesc')}</p>
                  </div>
                  <Separator />

                  <DateRangePickers form={form} startName="start_date" endName="end_date" startLabel={t('editEvent.startDate')} endLabel={t('editEvent.endDate')} disablePast />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editEvent.startTime')}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormDescription>{t('editEvent.optional')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editEvent.endTime')}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormDescription>{t('editEvent.optional')}</FormDescription>
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
                        <FormLabel>{t('editEvent.paymentDueDays')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="7" {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('editEvent.paymentDueDaysDesc')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 4: Financials & Settings */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t('editEvent.sectionFinancials')}</h3>
                    <p className="text-sm text-muted-foreground">{t('editEvent.sectionFinancialsDesc')}</p>
                  </div>
                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editEvent.currency')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('editEvent.selectCurrency')} />
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
                          <FormLabel>{t('editEvent.taxLocation')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('editEvent.selectTaxLocation')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Croatia">{t('editEvent.taxCroatia')}</SelectItem>
                              <SelectItem value="EU">{t('editEvent.taxEU')}</SelectItem>
                              <SelectItem value="Outside EU">{t('editEvent.taxOutsideEU')}</SelectItem>
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
                            <FormLabel>{t('editEvent.bcPosition')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('editEvent.bcPositionPlaceholder')} {...field} />
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
                            <FormLabel>{t('editEvent.bcReference')}</FormLabel>
                            <FormControl>
                              <BCReferenceField value={field.value || ''} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-sm font-medium text-foreground mb-3">{t('editEvent.sectionNotifications')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="notification_sender_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('editEvent.senderName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('editEvent.senderNamePlaceholder')} {...field} />
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
                          <FormLabel>{t('editEvent.senderEmail')}</FormLabel>
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
                        <FormLabel>{t('editEvent.supportPhone')}</FormLabel>
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
                        <FormLabel>{t('editEvent.supportContacts')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('editEvent.supportContactsPlaceholder')}
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <p className="text-sm font-medium text-foreground mb-3">{t('editEvent.sectionAdministration')}</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="additional_admins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('editEvent.additionalAdmins')}</FormLabel>
                        <FormControl>
                          <Input placeholder="admin1@email.com, admin2@email.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          {t('editEvent.additionalAdminsDesc')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <BrandingSection
                  values={branding}
                  onChange={handleBrandingChange}
                />

                <OrganizersInlineEditor
                  value={organizersInfo}
                  onChange={setOrganizersInfo}
                />

                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Detaljne informacije o suorganizatorima i tehničkom organizatoru (adresa, web, kontakt) možete unijeti nakon kreiranja eventa u postavkama eventa. / Detailed info about co-organizers and technical organizer can be entered after the event is created, in the event settings.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate('/events')}>
                    {t('editEvent.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('editEvent.createEvent')}
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
