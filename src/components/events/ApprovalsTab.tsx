import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePendingApprovalItems } from '@/hooks/useAdminNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Ticket, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ApprovalsTabProps {
  eventId: string;
  currency?: string;
}

export function ApprovalsTab({ eventId, currency = 'EUR' }: ApprovalsTabProps) {
  const { data, isLoading } = usePendingApprovalItems(eventId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<{ type: 'tier' | 'service'; id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);

  const approveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'tier' | 'service'; id: string }) => {
      const table = type === 'tier' ? 'ticket_tiers' : 'event_services';
      const { error } = await supabase
        .from(table)
        .update({
          status: 'active',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      // Resolve related notifications
      await supabase
        .from('admin_notifications')
        .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('event_id', eventId)
        .is('resolved_at', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approval-items', eventId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['events-with-pending-items'] });
      toast.success('Approved and now live!');
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ type, id, reason }: { type: 'tier' | 'service'; id: string; reason: string }) => {
      const table = type === 'tier' ? 'ticket_tiers' : 'event_services';
      const { error } = await supabase
        .from(table)
        .update({ status: 'rejected', approval_note: reason })
        .eq('id', id);
      if (error) throw error;

      await supabase
        .from('admin_notifications')
        .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('event_id', eventId)
        .is('resolved_at', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approval-items', eventId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-tiers', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['events-with-pending-items'] });
      toast.success('Item rejected');
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject'),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasPending = (data?.tiers.length || 0) + (data?.services.length || 0) > 0;

  if (!hasPending) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm">No pending items to review for this event.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Pending Ticket Tiers */}
        {data?.tiers && data.tiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-4 w-4" />
                Pending Ticket Tiers
                <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 ml-2">
                  {data.tiers.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.tiers.map((tier) => (
                <div key={tier.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">{tier.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(Number(tier.price))}
                      {tier.capacity && ` · ${tier.capacity} spots`}
                    </p>
                    {tier.description && (
                      <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ type: 'tier', id: tier.id })}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setRejectTarget({ type: 'tier', id: tier.id, name: tier.name })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Services */}
        {data?.services && data.services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Pending Services
                <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 ml-2">
                  {data.services.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(Number(service.price))}
                      {service.capacity && ` · ${service.capacity} spots`}
                    </p>
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ type: 'service', id: service.id })}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setRejectTarget({ type: 'service', id: service.id, name: service.name })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject "{rejectTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Optionally provide a reason for rejection:</p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectTarget) {
                  rejectMutation.mutate({
                    type: rejectTarget.type,
                    id: rejectTarget.id,
                    reason: rejectReason,
                  });
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
