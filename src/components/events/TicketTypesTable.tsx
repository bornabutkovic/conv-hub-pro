import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Ticket, Tag } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { AddTicketTypeModal } from './AddTicketTypeModal';
import { EditTicketTypeModal } from './EditTicketTypeModal';
import type { Tables } from '@/integrations/supabase/types';

type TicketType = Tables<'ticket_types'>;
type PriceTier = Tables<'ticket_price_tiers'>;

interface TicketWithTiers extends TicketType {
  priceTiers?: PriceTier[];
}

interface TicketTypesTableProps {
  eventId: string;
  currency?: string;
}

export function TicketTypesTable({ eventId, currency = 'EUR' }: TicketTypesTableProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  // Fetch ticket types
  const { data: ticketTypes, isLoading } = useQuery({
    queryKey: ['ticket-types', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as TicketType[];
    },
    enabled: !!eventId,
  });

  // Fetch all price tiers for the event's ticket types
  const { data: allPriceTiers } = useQuery({
    queryKey: ['all-price-tiers', eventId],
    queryFn: async () => {
      if (!ticketTypes?.length) return [];
      
      const ticketIds = ticketTypes.map((t) => t.id);
      const { data, error } = await supabase
        .from('ticket_price_tiers')
        .select('*')
        .in('ticket_type_id', ticketIds)
        .order('price', { ascending: true });

      if (error) throw error;
      return data as PriceTier[];
    },
    enabled: !!ticketTypes?.length,
  });

  // Combine tickets with their price tiers
  const ticketsWithTiers: TicketWithTiers[] =
    ticketTypes?.map((ticket) => ({
      ...ticket,
      priceTiers: allPriceTiers?.filter((t) => t.ticket_type_id === ticket.id) || [],
    })) || [];

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      // Delete price tiers first
      const { error: tiersError } = await supabase
        .from('ticket_price_tiers')
        .delete()
        .eq('ticket_type_id', ticketId);

      if (tiersError) throw tiersError;

      // Then delete the ticket type
      const { error } = await supabase
        .from('ticket_types')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types', eventId] });
      queryClient.invalidateQueries({ queryKey: ['all-price-tiers', eventId] });
      toast.success('Service deleted successfully');
      setDeletingTicketId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete service');
      console.error('Delete error:', error);
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getCurrentActivePrice = (tiers: PriceTier[]): { price: number; tierName: string } | null => {
    if (!tiers.length) return null;

    const now = new Date();
    
    // Find the currently active tier (within valid date range)
    const activeTier = tiers.find((tier) => {
      const startValid = !tier.sales_start_at || new Date(tier.sales_start_at) <= now;
      const endValid = !tier.sales_end_at || new Date(tier.sales_end_at) >= now;
      return startValid && endValid;
    });

    if (activeTier) {
      return { price: activeTier.price, tierName: activeTier.name };
    }

    // If no active tier, return the lowest price
    const lowestTier = tiers.reduce((min, tier) => 
      tier.price < min.price ? tier : min, tiers[0]
    );
    
    return { price: lowestTier.price, tierName: lowestTier.name };
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
            Tickets & Pricing / Kotizacije
          </CardTitle>
          <CardDescription>
            Manage services and pricing tiers for this event
          </CardDescription>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </CardHeader>
      <CardContent>
        {!ticketsWithTiers || ticketsWithTiers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No services configured yet.</p>
            <p className="text-sm">Click "Add Service" to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Price Tiers</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsWithTiers.map((ticket) => {
                const activePrice = getCurrentActivePrice(ticket.priceTiers || []);
                
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-muted-foreground">
                      {ticket.display_order ?? 0}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.name}</p>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {ticket.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ticket.bc_sku || '-'}
                    </TableCell>
                    <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                    <TableCell>
                      {activePrice ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <p className="font-mono font-medium">
                                  {formatPrice(activePrice.price)}
                                  {ticket.vat_rate ? ` + ${ticket.vat_rate}% VAT` : ''}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {activePrice.tierName}
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Active tier: {activePrice.tierName}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="font-mono">
                          {formatPrice(ticket.price)}
                          {ticket.vat_rate ? ` + ${ticket.vat_rate}% VAT` : ''}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ticket.priceTiers && ticket.priceTiers.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="cursor-help gap-1">
                                <Tag className="h-3 w-3" />
                                {ticket.priceTiers.length} tier{ticket.priceTiers.length > 1 ? 's' : ''}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                {ticket.priceTiers.map((tier) => (
                                  <div key={tier.id} className="flex justify-between gap-4 text-sm">
                                    <span>{tier.name}</span>
                                    <span className="font-mono">{formatPrice(tier.price)}</span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ticket.quota ? (
                        <span>{ticket.quota} available</span>
                      ) : (
                        <span className="text-muted-foreground">Unlimited</span>
                      )}
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
                );
              })}
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
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This will also delete all associated price tiers. This action cannot be undone.
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
