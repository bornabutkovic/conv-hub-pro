import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { Plus, Pencil, Trash2, Ticket, Loader2, AlertTriangle, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { TicketTierModal } from './TicketTierModal';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

type TicketTier = Tables<'ticket_tiers'>;

interface TicketTiersTableProps {
  eventId: string;
  currency?: string;
  eventStatus?: string | null;
}

export function TicketTiersTable({ eventId, currency = 'EUR', eventStatus }: TicketTiersTableProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [deletingTierId, setDeletingTierId] = useState<string | null>(null);
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

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

  // Check which tiers have paid attendees
  const { data: tiersWithSales } = useQuery({
    queryKey: ['ticket-tiers-sales', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select('ticket_tier_id')
        .eq('event_id', eventId)
        .eq('payment_status', 'paid')
        .not('ticket_tier_id', 'is', null);

      if (error) throw error;
      const tierIds = new Set((data || []).map(a => a.ticket_tier_id).filter(Boolean));
      return tierIds;
    },
    enabled: !!eventId,
  });

  // ERP code inline update
  const erpMutation = useMutation({
    mutationFn: async ({ tierId, erpCode }: { tierId: string; erpCode: string }) => {
      const { error } = await supabase
        .from('ticket_tiers')
        .update({ erp_code: erpCode || null })
        .eq('id', tierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
      toast.success('ERP code updated');
    },
    onError: () => toast.error('Failed to update ERP code'),
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

  const isTierLocked = (tierId: string) => {
    return eventStatus === 'active' && tiersWithSales?.has(tierId);
  };

  const getStatusBadge = (tier: TicketTier) => {
    // Show approval status if not active
    if (tier.status === 'pending_approval') {
      return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Pending Approval</Badge>;
    }
    if (tier.status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }

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
                  {userIsAdmin && <TableHead>ERP Code</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => {
                  const locked = isTierLocked(tier.id);
                  return (
                    <TableRow key={tier.id} className={tier.status === 'rejected' ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                          <div>
                            {tier.name}
                            {tier.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {tier.description}
                              </p>
                            )}
                            {tier.status === 'rejected' && (tier as any).rejection_reason && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {(tier as any).rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(Number(tier.price))}</TableCell>
                      <TableCell>{formatCapacity(tier.capacity)}</TableCell>
                      <TableCell className="text-sm">
                        {formatSalesPeriod(tier.sales_start, tier.sales_end)}
                      </TableCell>
                      <TableCell>{getStatusBadge(tier)}</TableCell>
                      {userIsAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Input
                              className="h-8 w-28 text-xs font-mono"
                              placeholder="ERP code"
                              defaultValue={tier.erp_code || ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (tier.erp_code || '')) {
                                  erpMutation.mutate({ tierId: tier.id, erpCode: val });
                                }
                              }}
                            />
                            {eventStatus === 'active' && !tier.erp_code && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>Missing ERP Code</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={async () => {
                                  try {
                                    await supabase.functions.invoke('translate-content', {
                                      body: { type: 'ticket_tier', id: tier.id, source_lang: 'hr' },
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
                                    toast.success('Translation updated');
                                  } catch (e) {
                                    toast.error('Translation failed');
                                  }
                                }}
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Translate to English</TooltipContent>
                          </Tooltip>
                          {locked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(tier)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cannot edit name/price — tickets already sold. You can change capacity or end sales early.</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(tier)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingTierId(tier.id)}
                            disabled={locked}
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
      </Card>

      <TicketTierModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        eventId={eventId}
        tier={editingTier}
        eventStatus={eventStatus}
        isLocked={editingTier ? isTierLocked(editingTier.id) : false}
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
