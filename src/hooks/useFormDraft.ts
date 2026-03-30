import { useEffect, useRef, useCallback } from 'react';
import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Persists react-hook-form state to localStorage.
 * - Auto-saves on every change via `watch`.
 * - Rehydrates on mount if a draft exists.
 * - Clears on successful submit or explicit discard.
 *
 * For plain `useState`-based forms, use `useStateDraft` instead.
 */
export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  key: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const restoredRef = useRef(false);
  const storageKey = `form_draft_${key}`;

  // Rehydrate on mount
  useEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const saved = JSON.parse(raw, (k, v) => {
        // Restore ISO date strings back to Date objects
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
          const d = new Date(v);
          if (!isNaN(d.getTime())) return d;
        }
        return v;
      });

      const currentValues = form.getValues();
      const defaultKeys = Object.keys(currentValues);
      const hasData = defaultKeys.some((k) => {
        const val = saved[k];
        return val !== '' && val !== null && val !== undefined && val !== 0;
      });

      if (hasData) {
        // Only reset fields that exist in the form schema
        const filtered: Record<string, any> = {};
        for (const dk of defaultKeys) {
          if (dk in saved) filtered[dk] = saved[dk];
          else filtered[dk] = currentValues[dk as Path<T>];
        }
        form.reset(filtered as T);
        toast.info('Draft restored', { duration: 2000 });
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [enabled, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on every change
  useEffect(() => {
    if (!enabled) return;
    const sub = form.watch((values) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch { /* quota exceeded — ignore */ }
    });
    return () => sub.unsubscribe();
  }, [enabled, form, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft };
}

/**
 * Persists plain `useState`-style form objects to localStorage.
 * Call `saveDraft(formData)` on every change. Call `clearDraft()` on submit/cancel.
 * Returns `initialData` merged with any saved draft on first call.
 */
export function useStateDraft<T extends Record<string, any>>(
  key: string,
  initialData: T,
  options?: { enabled?: boolean }
): {
  restoredData: T;
  saveDraft: (data: T) => void;
  clearDraft: () => void;
  wasRestored: boolean;
} {
  const enabled = options?.enabled ?? true;
  const storageKey = `form_draft_${key}`;
  const restoredRef = useRef(false);
  const wasRestoredRef = useRef(false);

  let restoredData = initialData;

  if (enabled && !restoredRef.current) {
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<T>;
        const hasData = Object.values(saved).some(
          (v) => v !== '' && v !== null && v !== undefined && v !== 0
        );
        if (hasData) {
          restoredData = { ...initialData, ...saved };
          wasRestoredRef.current = true;
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  const saveDraft = useCallback(
    (data: T) => {
      if (!enabled) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch { /* ignore */ }
    },
    [enabled, storageKey]
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { restoredData, saveDraft, clearDraft, wasRestored: wasRestoredRef.current };
}
