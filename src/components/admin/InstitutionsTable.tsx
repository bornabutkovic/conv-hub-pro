import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Edit } from 'lucide-react';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

export function InstitutionsTable() {
  const navigate = useNavigate();
  const { t } = useAdminLanguage();

  const { data: institutions, isLoading } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!institutions?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('admin.noInstitutions')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.registeredInstitutions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('institution.name')}</TableHead>
              <TableHead>{t('institution.oib')}</TableHead>
              <TableHead>{t('institution.address')}</TableHead>
              <TableHead>{t('institution.city')}</TableHead>
              <TableHead>{t('institution.country')}</TableHead>
              <TableHead>{t('institution.invoiceEmail')}</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutions.map((institution) => (
              <TableRow key={institution.id}>
                <TableCell className="font-medium">{institution.name}</TableCell>
                <TableCell>{institution.oib}</TableCell>
                <TableCell>{institution.address}</TableCell>
                <TableCell>{institution.postal_code} {institution.city}</TableCell>
                <TableCell>{institution.country}</TableCell>
                <TableCell>{institution.invoice_email}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/institutions/${institution.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
