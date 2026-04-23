import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface BCReferenceFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function BCReferenceField({ value, onChange }: BCReferenceFieldProps) {
  const [salespersons, setSalespersons] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('salespersons')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (!active) return;
      if (!error && data) setSalespersons(data as { id: number; name: string }[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <Input placeholder="Loading…" disabled />;
  }

  if (salespersons.length === 0) {
    return (
      <Input
        placeholder="Referent name"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select referent" />
      </SelectTrigger>
      <SelectContent>
        {salespersons.map((sp) => (
          <SelectItem key={sp.id} value={sp.name}>
            {sp.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
