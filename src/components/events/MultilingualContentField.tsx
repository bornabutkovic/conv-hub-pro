import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FLAGS: Record<string, string> = {
  hr: '🇭🇷',
  en: '🇬🇧',
  de: '🇩🇪',
};

interface MultilingualContentFieldProps {
  /** Languages enabled for this event (e.g. ['hr','en']). 'hr' is always shown. */
  supportedLanguages: string[];
  /** Render the editor for a given language. */
  renderEditor: (lang: string) => ReactNode;
  /** Optional label rendered above the tabs. */
  label?: ReactNode;
  /** Optional helper text rendered below the tabs. */
  description?: ReactNode;
}

/**
 * Compact pill-style HR/EN/DE language switcher that swaps the editor
 * for the active language. HR is always shown; other languages only
 * appear when included in supportedLanguages.
 */
export function MultilingualContentField({
  supportedLanguages,
  renderEditor,
  label,
  description,
}: MultilingualContentFieldProps) {
  const langs = ['hr', ...supportedLanguages.filter((l) => l !== 'hr')];
  const [active, setActive] = useState<string>('hr');

  // If active lang got removed from supported list, fall back to hr
  const activeLang = langs.includes(active) ? active : 'hr';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {label && <div className="text-sm font-medium text-foreground">{label}</div>}
        {langs.length > 1 && (
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
            {langs.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActive(lang)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors flex items-center gap-1',
                  activeLang === lang
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{FLAGS[lang] || ''}</span>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
      {renderEditor(activeLang)}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
