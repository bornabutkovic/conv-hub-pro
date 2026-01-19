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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  // Additional fields
  status: z.enum(['draft', 'active']),
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
    if (!profile?.institution_uuid) {
      toast.error('No institution linked to your profile');
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

      const { error } = await supabase.from('events').insert({
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
        status: data.status,
        institution_uuid: profile.institution_uuid,
      });

      if (error) throw error;

      toast.success('Event created successfully!');
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
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

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
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
