import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Package, Pencil, AlertTriangle, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { AddServiceModal } from './AddServiceModal';
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
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';

interface EventServicesTableProps {
  eventId: string;
  currency: string;
  eventStatus?: string | null;
}

export function EventServicesTable({ eventId, currency, eventStatus }: EventServicesTableProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editService, setEditService] = useState<any | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userIsAdmin = isAdmin(profile?.role);

  const { data: services, isLoading } = useQuery({
    queryKey: ['event-services', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_services')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  // Check which services have sales
  const { data: servicesWithSales } = useQuery({
    queryKey: ['event-services-sales', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('service_id')
        .not('service_id', 'is', null);
      if (error) throw error;
      return new Set((data || []).map(oi => oi.service_id).filter(Boolean));
    },
    enabled: !!eventId,
  });

  const isServiceLocked = (serviceId: string) => {
    return eventStatus === 'active' && servicesWithSales?.has(serviceId);
  };

  const erpMutation = useMutation({
    mutationFn: async ({ serviceId, erpCode }: { serviceId: string; erpCode: string }) => {
      const { error } = await supabase
        .from('event_services')
        .update({ erp_code: erpCode || null })
        .eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
      toast.success('ERP code updated');
    },
    onError: () => toast.error('Failed to update ERP code'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('event_services')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
      toast.success('Service deleted successfully');
      setDeleteServiceId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete service: ' + error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
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
              <Package className="h-5 w-5" />
              Services & Add-ons
            </CardTitle>
            <CardDescription>
              Manage purchasable services for this event (e.g., Gala Dinner, Workshops)
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </CardHeader>
        <CardContent>
          {services && services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  {userIsAdmin && <TableHead>ERP Code</TableHead>}
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => {
                  const locked = isServiceLocked(service.id);
                  return (
                    <TableRow key={service.id} className={service.status === 'rejected' ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                          <div>
                            {service.name}
                            {service.status === 'rejected' && (service as any).rejection_reason && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {(service as any).rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {service.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(service.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {service.capacity ?? 'Unlimited'}
                      </TableCell>
                      <TableCell>
                        {service.status === 'pending_approval' ? (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Pending</Badge>
                        ) : service.status === 'rejected' ? (
                          <Badge variant="destructive">Rejected</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      {userIsAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Input
                              className="h-8 w-28 text-xs font-mono"
                              placeholder="ERP code"
                              defaultValue={service.erp_code || ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (service.erp_code || '')) {
                                  erpMutation.mutate({ serviceId: service.id, erpCode: val });
                                }
                              }}
                            />
                            {eventStatus === 'active' && !service.erp_code && (
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
                      <TableCell className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                try {
                                  await supabase.functions.invoke('translate-content', {
                                    body: { type: 'event_service', id: service.id, source_lang: 'hr' },
                                  });
                                  queryClient.invalidateQueries({ queryKey: ['event-services', eventId] });
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
                              <span>
                                <Button variant="ghost" size="icon" disabled>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Cannot edit — items already sold</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-muted"
                            onClick={() => setEditService(service)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteServiceId(service.id)}
                          disabled={locked}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No services added yet.</p>
              <p className="text-sm">Add services that attendees can purchase via WhatsApp.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddServiceModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        eventId={eventId}
        currency={currency}
        eventStatus={eventStatus}
      />

      {editService && (
        <AddServiceModal
          open={!!editService}
          onOpenChange={(open) => !open && setEditService(null)}
          eventId={eventId}
          currency={currency}
          editService={editService}
          eventStatus={eventStatus}
        />
      )}

      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteServiceId && deleteMutation.mutate(deleteServiceId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
