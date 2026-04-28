import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useFormDraft } from '@/hooks/useFormDraft';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  oib: z.string().min(11, 'OIB must be 11 digits').max(11, 'OIB must be 11 digits'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  invoice_email: z.string().email('Valid email is required'),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface CreateInstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInstitutionModal({ open, onOpenChange }: CreateInstitutionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useAdminLanguage();

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
      website: '',
    },
  });

  const { clearDraft } = useFormDraft(form, 'create_institution_modal', { enabled: open });

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
        website: data.website || null,
      });

      if (error) throw error;

      clearDraft();
      toast.success(t('institutionModal.successCreated'));
      queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create institution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('institutionModal.createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('institutionModal.companyName')}</FormLabel>
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
                  <FormLabel>{t('institutionModal.oib')}</FormLabel>
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
                  <FormLabel>{t('institutionModal.address')}</FormLabel>
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
                    <FormLabel>{t('institutionModal.postalCode')}</FormLabel>
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
                    <FormLabel>{t('institutionModal.city')}</FormLabel>
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
                  <FormLabel>{t('institutionModal.country')}</FormLabel>
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
                  <FormLabel>{t('institutionModal.invoiceEmail')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="invoices@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('institutionModal.website') || 'Web stranica / Website'}</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://www.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('institutionModal.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('institutionModal.creating') : t('institutionModal.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
