import { Checkbox } from '@/components/ui/checkbox';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const LANGUAGE_OPTIONS = [
  { value: 'hr', label: 'HR - Croatian', flag: '🇭🇷' },
  { value: 'en', label: 'EN - English', flag: '🇬🇧' },
  { value: 'de', label: 'DE - German', flag: '🇩🇪' },
];

interface LanguagesFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  idPrefix?: string;
}

/**
 * Multi-select checkbox group for choosing supported languages.
 * HR is always selected and disabled (cannot be unchecked).
 */
export function LanguagesField({ value, onChange, idPrefix = 'lang' }: LanguagesFieldProps) {
  return (
    <FormItem>
      <FormLabel>Jezici eventa / Event Languages *</FormLabel>
      <div className="flex flex-wrap gap-4 pt-2">
        {LANGUAGE_OPTIONS.map((lang) => {
          const isHr = lang.value === 'hr';
          const checked = isHr ? true : value?.includes(lang.value);
          return (
            <div key={lang.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${idPrefix}-${lang.value}`}
                checked={checked}
                disabled={isHr}
                onCheckedChange={(c) => {
                  if (isHr) return;
                  if (c) {
                    onChange([...(value || []).filter((v) => v !== lang.value), lang.value]);
                  } else {
                    onChange((value || []).filter((v) => v !== lang.value));
                  }
                }}
              />
              <label
                htmlFor={`${idPrefix}-${lang.value}`}
                className="text-sm font-medium leading-none flex items-center gap-1.5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <span>{lang.flag}</span>
                {lang.label}
              </label>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground pt-1">
        Hrvatski je primarni jezik i ne može se ukloniti. / Croatian is the primary language and cannot be removed.
      </p>
      <FormMessage />
    </FormItem>
  );
}
