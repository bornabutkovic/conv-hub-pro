import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FLAGS: Record<string, string> = {
  hr: '🇭🇷',
  en: '🇬🇧',
  de: '🇩🇪',
};

interface ContentSectionProps {
  /** Languages enabled for this event. HR is always shown. */
  supportedLanguages: string[];
  /** Render the editor block for the active language. */
  renderForLanguage: (lang: string) => ReactNode;
}

/**
 * Single global HR/EN pill switcher containing ALL translatable fields
 * (name, description, cancellation policy) for the active language.
 *
 * Each language has fully isolated state — switching tabs does NOT
 * sync content between languages. Callers are responsible for binding
 * HR fields to react-hook-form and EN fields to separate useState.
 */
export function ContentSection({ supportedLanguages, renderForLanguage }: ContentSectionProps) {
  const langs = ['hr', ...supportedLanguages.filter((l) => l !== 'hr')];
  const [active, setActive] = useState<string>('hr');
  const activeLang = langs.includes(active) ? active : 'hr';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sadržaj / Content</h3>
          <p className="text-sm text-muted-foreground">
            Naziv, opis i politika otkazivanja za svaki jezik
          </p>
        </div>
        {langs.length > 1 && (
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
            {langs.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActive(lang)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-sm transition-colors flex items-center gap-1.5',
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
      <div className="border-t border-border" />
      <div key={activeLang} className="space-y-4">
        {renderForLanguage(activeLang)}
      </div>
    </div>
  );
}
