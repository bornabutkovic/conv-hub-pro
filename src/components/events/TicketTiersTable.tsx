import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { Plus, Pencil, Trash2, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Tables } from '@/integrations/supabase/types';
import { TicketTierModal } from './TicketTierModal';

type TicketTier = Tables<'ticket_tiers'>;

interface TicketTiersTableProps {
  eventId: string;
  currency?: string;
}

export function TicketTiersTable({ eventId, currency = 'EUR' }: TicketTiersTableProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [deletingTierId, setDeletingTierId] = useState<string | null>(null);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['ticket-tiers', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .order('price', { ascending: true });

      if (error) throw error;
      return data as TicketTier[];
    },
    enabled: !!eventId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const { error } = await supabase
        .from('ticket_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
      toast.success('Ticket tier deleted successfully');
      setDeletingTierId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete ticket tier');
      console.error(error);
    },
  });

  const getStatusBadge = (tier: TicketTier) => {
    const now = new Date();
    const salesStart = tier.sales_start ? new Date(tier.sales_start) : null;
    const salesEnd = tier.sales_end ? new Date(tier.sales_end) : null;

    if (salesStart && isBefore(now, salesStart)) {
      return <Badge variant="secondary">Upcoming</Badge>;
    }

    if (salesEnd && isAfter(now, salesEnd)) {
      return <Badge variant="outline">Expired</Badge>;
    }

    if (salesStart && salesEnd && isWithinInterval(now, { start: salesStart, end: salesEnd })) {
      return <Badge variant="default">Active</Badge>;
    }

    if (salesStart && !salesEnd && isAfter(now, salesStart)) {
      return <Badge variant="default">Active</Badge>;
    }

    return <Badge variant="secondary">No dates set</Badge>;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatCapacity = (capacity: number | null) => {
    if (capacity === null || capacity === undefined) {
      return 'Unlimited';
    }
    // TODO: Add sold count when we track ticket sales
    return `${capacity}`;
  };

  const formatSalesPeriod = (start: string | null, end: string | null) => {
    if (!start && !end) return 'Not set';
    
    const startStr = start ? format(new Date(start), 'MMM d, yyyy') : 'Open';
    const endStr = end ? format(new Date(end), 'MMM d, yyyy') : 'Ongoing';
    
    return `${startStr} - ${endStr}`;
  };

  const handleEdit = (tier: TicketTier) => {
    setEditingTier(tier);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingTier(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTier(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Ticket Tiers
          </CardTitle>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Ticket Tier
          </Button>
        </CardHeader>
        <CardContent>
          {!tiers || tiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ticket tiers configured yet.</p>
              <p className="text-sm mt-1">Add your first ticket tier to start selling.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Sales Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">
                      <div>
                        {tier.name}
                        {tier.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {tier.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(Number(tier.price))}</TableCell>
                    <TableCell>{formatCapacity(tier.capacity)}</TableCell>
                    <TableCell className="text-sm">
                      {formatSalesPeriod(tier.sales_start, tier.sales_end)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tier)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingTierId(tier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TicketTierModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        eventId={eventId}
        tier={editingTier}
      />

      <AlertDialog open={!!deletingTierId} onOpenChange={() => setDeletingTierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket tier? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTierId && deleteMutation.mutate(deletingTierId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
