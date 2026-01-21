import { useState } from 'react';
import { Gift, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  useAttendeePurchases,
  useEventServices,
  useAddPurchase,
  useRemovePurchase,
  useUpdatePurchaseStatus,
} from '@/hooks/useAttendeeServices';

interface AttendeeServicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendeeId: string;
  attendeeName: string;
  eventId: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', variant: 'secondary' as const },
  { value: 'paid', label: 'Paid', variant: 'default' as const },
  { value: 'cancelled', label: 'Cancelled', variant: 'destructive' as const },
];

export function AttendeeServicesModal({
  open,
  onOpenChange,
  attendeeId,
  attendeeName,
  eventId,
}: AttendeeServicesModalProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  const { data: purchases, isLoading: purchasesLoading } = useAttendeePurchases(attendeeId);
  const { data: availableServices, isLoading: servicesLoading } = useEventServices(eventId);

  const addPurchase = useAddPurchase();
  const removePurchase = useRemovePurchase();
  const updateStatus = useUpdatePurchaseStatus();

  // Filter out services that are already purchased
  const purchasedServiceIds = purchases?.map((p) => p.service_id) || [];
  const unpurchasedServices = availableServices?.filter(
    (s) => !purchasedServiceIds.includes(s.id)
  ) || [];

  // Calculate total
  const total = purchases?.reduce((sum, p) => sum + (p.service_price || 0), 0) || 0;
  const currency = purchases?.[0]?.service_currency || 'EUR';

  const handleAddService = async () => {
    if (!selectedServiceId) {
      toast.error('Please select a service');
      return;
    }

    try {
      await addPurchase.mutateAsync({ attendeeId, serviceId: selectedServiceId });
      toast.success('Service added successfully');
      setSelectedServiceId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add service');
    }
  };

  const handleRemoveService = async (purchaseId: string) => {
    try {
      await removePurchase.mutateAsync({ purchaseId, attendeeId });
      toast.success('Service removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove service');
    }
  };

  const handleStatusChange = async (purchaseId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ purchaseId, status: newStatus, attendeeId });
      toast.success('Status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
    return <Badge variant={option.variant}>{option.label}</Badge>;
  };

  const formatPrice = (price: number, curr: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: curr,
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Services for {attendeeName}
          </DialogTitle>
          <DialogDescription>
            Manage purchased services and add-ons for this attendee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Service Section */}
          <div className="flex gap-2">
            <Select
              value={selectedServiceId}
              onValueChange={setSelectedServiceId}
              disabled={servicesLoading || unpurchasedServices.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  servicesLoading 
                    ? 'Loading services...' 
                    : unpurchasedServices.length === 0 
                      ? 'No more services available' 
                      : 'Select a service to add'
                } />
              </SelectTrigger>
              <SelectContent>
                {unpurchasedServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - {formatPrice(service.price, service.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddService}
              disabled={!selectedServiceId || addPurchase.isPending}
            >
              {addPurchase.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Separator />

          {/* Purchases List */}
          {purchasesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : purchases && purchases.length > 0 ? (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{purchase.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(purchase.service_price, purchase.service_currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={purchase.status}
                      onValueChange={(value) => handleStatusChange(purchase.id, value)}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue>{getStatusBadge(purchase.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <Badge variant={option.variant}>{option.label}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveService(purchase.id)}
                      disabled={removePurchase.isPending}
                    >
                      {removePurchase.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(total, currency)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No services purchased yet</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
