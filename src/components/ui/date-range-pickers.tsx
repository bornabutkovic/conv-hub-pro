import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface DateRangePickersProps {
  form: UseFormReturn<any>;
  startName: string;
  endName: string;
  startLabel?: string;
  endLabel?: string;
  disablePast?: boolean;
  disabled?: boolean;
}

export function DateRangePickers({
  form,
  startName,
  endName,
  startLabel = 'Start Date',
  endLabel = 'End Date',
  disablePast = false,
  disabled = false,
}: DateRangePickersProps) {
  const [endOpen, setEndOpen] = useState(false);

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name={startName}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{startLabel}</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    {field.value ? format(field.value, 'PPP') : <span>Pick date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={(date) => {
                    field.onChange(date);
                    // Auto-open the end date picker after a brief delay
                    if (date) {
                      setTimeout(() => setEndOpen(true), 150);
                    }
                  }}
                  disabled={disablePast ? (date) => date < new Date() : undefined}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={endName}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{endLabel}</FormLabel>
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    {field.value ? format(field.value, 'PPP') : <span>Pick date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value || undefined}
                  onSelect={(date) => {
                    field.onChange(date);
                    setEndOpen(false);
                  }}
                  disabled={(date) => {
                    const startDate = form.getValues(startName);
                    if (startDate && date < startDate) return true;
                    if (disablePast && !startDate && date < new Date()) return true;
                    return false;
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
