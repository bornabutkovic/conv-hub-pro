import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { AddTicketTypeModal } from './AddTicketTypeModal';
import { EditTicketTypeModal } from './EditTicketTypeModal';
import type { Tables } from '@/integrations/supabase/types';

type TicketType = Tables<'ticket_types'>;

interface TicketTypesTableProps {
  eventId: string;
  currency?: string;
}

export function TicketTypesTable({ eventId, currency = 'EUR' }: TicketTypesTableProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const { data: ticketTypes, isLoading } = useQuery({
    queryKey: ['ticket-types', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TicketType[];
    },
    enabled: !!eventId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('ticket_types')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types', eventId] });
      toast.success('Ticket type deleted successfully');
      setDeletingTicketId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete ticket type');
      console.error('Delete error:', error);
    },
  });

  const formatPrice = (price: number, vatRate: number | null) => {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);

    if (vatRate) {
      return `${formattedPrice} + ${vatRate}% VAT`;
    }
    return formattedPrice;
  };

  const getCategoryBadge = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'registration':
        return <Badge variant="default">Registration</Badge>;
      case 'dinner/social':
        return <Badge variant="secondary">Dinner/Social</Badge>;
      case 'workshop':
        return <Badge variant="outline">Workshop</Badge>;
      default:
        return <Badge variant="secondary">{category || 'Other'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tickets & Pricing
          </CardTitle>
          <CardDescription>
            Manage ticket types and pricing for this event
          </CardDescription>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ticket Type
        </Button>
      </CardHeader>
      <CardContent>
        {!ticketTypes || ticketTypes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No ticket types configured yet.</p>
            <p className="text-sm">Click "Add Ticket Type" to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketTypes.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.name}</TableCell>
                  <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                  <TableCell className="font-mono">
                    {formatPrice(ticket.price, ticket.vat_rate)}
                  </TableCell>
                  <TableCell>
                    {ticket.quota ? (
                      <span>{ticket.quota} available</span>
                    ) : (
                      <span className="text-muted-foreground">Unlimited</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {ticket.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTicket(ticket)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTicketId(ticket.id)}
                        className="text-destructive hover:text-destructive"
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

      {/* Add Modal */}
      <AddTicketTypeModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        eventId={eventId}
      />

      {/* Edit Modal */}
      {editingTicket && (
        <EditTicketTypeModal
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          eventId={eventId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTicketId} onOpenChange={() => setDeletingTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket type? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTicketId && deleteMutation.mutate(deletingTicketId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
