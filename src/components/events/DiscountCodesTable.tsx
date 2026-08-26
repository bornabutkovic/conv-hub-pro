import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Percent, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { DiscountCodeModal } from './DiscountCodeModal';

interface DiscountCodesTableProps {
  eventId: string;
  currency: string;
}

export function DiscountCodesTable({ eventId, currency }: DiscountCodesTableProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCode, setEditCode] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: codes, isLoading } = useQuery({
    queryKey: ['discount-codes', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discount_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes', eventId] });
      toast.success('Discount code deleted');
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete discount code: ' + error.message);
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'EUR' }).format(amount);

  const formatDiscount = (type: string, value: number) =>
    type === 'percentage' ? `-${Number(value)}%` : `-${formatCurrency(Number(value))}`;

  const formatSalesPeriod = (start: string | null, end: string | null) => {
    if (!start && !end) return 'Not set';
    const startStr = start ? format(new Date(start), 'MMM d, yyyy') : 'Open';
    const endStr = end ? format(new Date(end), 'MMM d, yyyy') : 'Ongoing';
    return `${startStr} - ${endStr}`;
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Discount Codes
            </CardTitle>
            <CardDescription>
              Manage promotional codes for tickets and services of this event
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Discount Code
          </Button>
        </CardHeader>
        <CardContent>
          {codes && codes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Sales Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code: any) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-1.5">
                        {code.code}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {code.description && (
                        <div className="text-xs text-muted-foreground font-sans font-normal mt-0.5">
                          {code.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDiscount(code.discount_type, code.discount_value)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {code.applies_to_all_tickets ? 'All Tickets' : 'Specific tickets'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {code.applies_to_all_services ? 'All Services' : 'Specific services'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatSalesPeriod(code.sales_start, code.sales_end)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.status === 'active' ? 'default' : 'secondary'}>
                        {code.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {code.times_used ?? 0} used
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-muted"
                        onClick={() => setEditCode(code)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(code.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Percent className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No discount codes yet.</p>
              <p className="text-sm">
                Create a code to offer a percentage or fixed discount on specific tickets or services.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DiscountCodeModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        eventId={eventId}
        currency={currency}
      />

      {editCode && (
        <DiscountCodeModal
          open={!!editCode}
          onOpenChange={(open) => !open && setEditCode(null)}
          eventId={eventId}
          currency={currency}
          discountCode={editCode}
          onSaved={() => setEditCode(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this discount code? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
