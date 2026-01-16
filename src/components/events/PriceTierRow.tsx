import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export interface PriceTier {
  id?: string;
  name: string;
  price: number;
  sales_start_at: string;
  sales_end_at: string;
}

interface PriceTierRowProps {
  tier: PriceTier;
  index: number;
  onChange: (index: number, field: keyof PriceTier, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function PriceTierRow({
  tier,
  index,
  onChange,
  onRemove,
  canRemove,
}: PriceTierRowProps) {
  return (
    <div className="grid grid-cols-[1fr_100px_1fr_1fr_40px] gap-2 items-start">
      <Input
        placeholder="e.g., Early Bird"
        value={tier.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        required
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={tier.price}
        onChange={(e) => onChange(index, 'price', parseFloat(e.target.value) || 0)}
        required
      />
      <Input
        type="datetime-local"
        value={tier.sales_start_at}
        onChange={(e) => onChange(index, 'sales_start_at', e.target.value)}
      />
      <Input
        type="datetime-local"
        value={tier.sales_end_at}
        onChange={(e) => onChange(index, 'sales_end_at', e.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="text-destructive hover:text-destructive disabled:opacity-30"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
