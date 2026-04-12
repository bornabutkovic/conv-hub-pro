import { useState } from 'react';
import { Languages, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranslationData {
  name?: string;
  description?: string;
  auto_translated?: boolean;
}

interface TranslatableFieldsProps {
  /** Which fields to show: 'name' | 'name+description' */
  fields: 'name' | 'name+description';
  /** HR values (main form fields) */
  hrName: string;
  hrDescription?: string;
  /** EN translation values */
  enName: string;
  enDescription?: string;
  autoTranslated?: boolean;
  /** Callbacks when EN fields change */
  onEnNameChange: (value: string) => void;
  onEnDescriptionChange?: (value: string) => void;
  /** For auto-translate */
  translateType: 'event' | 'ticket_tier' | 'event_service';
  translateId?: string;
  /** After successful auto-translate, refresh data */
  onTranslated?: () => void;
  /** Whether the item has been saved (has an ID) */
  canAutoTranslate?: boolean;
  /** Use RichTextEditor for description? */
  useRichDescription?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function TranslatableFields({
  fields,
  hrName,
  hrDescription,
  enName,
  enDescription,
  autoTranslated,
  onEnNameChange,
  onEnDescriptionChange,
  translateType,
  translateId,
  onTranslated,
  canAutoTranslate = true,
  disabled,
}: TranslatableFieldsProps) {
  const [activeLang, setActiveLang] = useState<'hr' | 'en'>('hr');
  const [isTranslating, setIsTranslating] = useState(false);

  const handleAutoTranslate = async () => {
    if (!translateId) {
      toast.error('Save the item first before auto-translating.');
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { type: translateType, id: translateId, source_lang: 'hr' },
      });
      if (error) throw error;
      toast.success('Auto-translation completed');
      onTranslated?.();
    } catch (err: any) {
      toast.error(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Language tab bar */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setActiveLang('hr')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
              activeLang === 'hr'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🇭🇷 HR
          </button>
          <button
            type="button"
            onClick={() => setActiveLang('en')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
              activeLang === 'en'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🇬🇧 EN
          </button>
        </div>

        {activeLang === 'en' && canAutoTranslate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoTranslate}
            disabled={isTranslating || !translateId || disabled}
            className="h-7 text-xs gap-1"
          >
            {isTranslating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Languages className="h-3 w-3" />
            )}
            Auto-translate to EN
          </Button>
        )}
      </div>

      {/* HR tab */}
      {activeLang === 'hr' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name (HR) — primary</Label>
            <Input value={hrName} disabled className="bg-muted/50" />
          </div>
          {fields === 'name+description' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description (HR) — primary</Label>
              <Textarea value={hrDescription || ''} disabled className="bg-muted/50 resize-none min-h-[80px]" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Edit HR content in the main fields above.</p>
        </div>
      )}

      {/* EN tab */}
      {activeLang === 'en' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Name (EN)</Label>
              {autoTranslated && enName && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  Auto-translated
                </Badge>
              )}
            </div>
            <Input
              value={enName}
              onChange={(e) => onEnNameChange(e.target.value)}
              placeholder="English name..."
              disabled={disabled}
            />
          </div>
          {fields === 'name+description' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Description (EN)</Label>
                {autoTranslated && enDescription && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" />
                    Auto-translated
                  </Badge>
                )}
              </div>
              <Textarea
                value={enDescription || ''}
                onChange={(e) => onEnDescriptionChange?.(e.target.value)}
                placeholder="English description..."
                disabled={disabled}
                className="resize-none min-h-[80px]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
