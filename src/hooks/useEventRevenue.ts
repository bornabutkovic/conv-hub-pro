import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventRevenue {
  paid: number;
  pending: number;
}

export function useEventRevenue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['event-revenue', user?.id],
    queryFn: async (): Promise<Map<string, EventRevenue>> => {
      const { data, error } = await supabase
        .from('attendees')
        .select('event_id, price_paid, payment_status');

      if (error) throw error;

      const map = new Map<string, EventRevenue>();
      (data || []).forEach((row: any) => {
        if (!row.event_id) return;
        const current = map.get(row.event_id) || { paid: 0, pending: 0 };
        const amount = Number(row.price_paid) || 0;
        if (row.payment_status === 'paid') {
          current.paid += amount;
        } else {
          current.pending += amount;
        }
        map.set(row.event_id, current);
      });

      return map;
    },
    enabled: !!user,
  });
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
