import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COUNTRY_CODES = [
  { code: '+385', label: '🇭🇷 +385', country: 'Croatia' },
  { code: '+386', label: '🇸🇮 +386', country: 'Slovenia' },
  { code: '+381', label: '🇷🇸 +381', country: 'Serbia' },
  { code: '+387', label: '🇧🇦 +387', country: 'Bosnia' },
  { code: '+382', label: '🇲🇪 +382', country: 'Montenegro' },
  { code: '+389', label: '🇲🇰 +389', country: 'N. Macedonia' },
  { code: '+383', label: '🇽🇰 +383', country: 'Kosovo' },
  { code: '+49', label: '🇩🇪 +49', country: 'Germany' },
  { code: '+43', label: '🇦🇹 +43', country: 'Austria' },
  { code: '+41', label: '🇨🇭 +41', country: 'Switzerland' },
  { code: '+44', label: '🇬🇧 +44', country: 'UK' },
  { code: '+1', label: '🇺🇸 +1', country: 'USA' },
  { code: '+33', label: '🇫🇷 +33', country: 'France' },
  { code: '+39', label: '🇮🇹 +39', country: 'Italy' },
  { code: '+34', label: '🇪🇸 +34', country: 'Spain' },
  { code: '+31', label: '🇳🇱 +31', country: 'Netherlands' },
  { code: '+48', label: '🇵🇱 +48', country: 'Poland' },
  { code: '+36', label: '🇭🇺 +36', country: 'Hungary' },
  { code: '+40', label: '🇷🇴 +40', country: 'Romania' },
  { code: '+359', label: '🇧🇬 +359', country: 'Bulgaria' },
  { code: '+420', label: '🇨🇿 +420', country: 'Czechia' },
  { code: '+421', label: '🇸🇰 +421', country: 'Slovakia' },
] as const;

function parsePhoneValue(value: string): { countryCode: string; number: string } {
  if (!value) return { countryCode: '+385', number: '' };
  
  // Try to match a known country code prefix
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (value.startsWith(cc.code)) {
      return { countryCode: cc.code, number: value.slice(cc.code.length).trim() };
    }
  }
  
  // Fallback: if starts with +, try to split
  if (value.startsWith('+')) {
    const match = value.match(/^(\+\d{1,4})\s*(.*)/);
    if (match) return { countryCode: match[1], number: match[2] };
  }
  
  return { countryCode: '+385', number: value };
}

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PhoneInput({ value = '', onChange, placeholder = '91 234 5678', className, disabled }: PhoneInputProps) {
  const { countryCode, number } = parsePhoneValue(value);

  const handleCountryChange = (newCode: string) => {
    onChange?.(number ? `${newCode} ${number}` : newCode);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    onChange?.(num ? `${countryCode} ${num}` : '');
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[120px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              {cc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}
