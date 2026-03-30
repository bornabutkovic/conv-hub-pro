import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormDraft } from '@/hooks/useFormDraft';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  oib: z.string().min(11, 'OIB must be 11 digits').max(11, 'OIB must be 11 digits'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  invoice_email: z.string().email('Valid email is required'),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateInstitution() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      oib: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'Croatia',
      invoice_email: '',
    },
  });

  const { clearDraft } = useFormDraft(form, 'create_institution');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('institutions').insert({
        name: data.name,
        oib: data.oib,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
        invoice_email: data.invoice_email,
      });

      if (error) throw error;

      clearDraft();
      toast.success('Institution created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create institution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Admin
      </Button>

      <div className="max-w-[720px] mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create New Institution</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp d.o.o." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oib"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OIB (Tax ID)</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678901" maxLength={11} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Ilica 123, 10000 Zagreb" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Zagreb" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Croatia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoice_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="invoices@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/admin')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Institution'}
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
