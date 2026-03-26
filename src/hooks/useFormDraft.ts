import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Persists form data to localStorage so users don't lose progress
 * when switching pages or getting interrupted.
 * Uses compositionend-safe approach to avoid dictionary/autocomplete clearing.
 */
export function useFormDraft<T extends Record<string, any>>(key: string, initialState: T) {
  const [form, setFormRaw] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`biztrack_draft_${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initialState to handle new fields
        return { ...initialState, ...parsed };
      }
    } catch { /* ignore */ }
    return initialState;
  });

  const isComposing = useRef(false);

  // Save to localStorage on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if there's actual content
      const hasContent = Object.values(form).some(v => v !== '' && v !== '0' && v !== 0 && v !== initialState[Object.keys(initialState)[0] as keyof T]);
      if (hasContent) {
        localStorage.setItem(`biztrack_draft_${key}`, JSON.stringify(form));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form, key]);

  const setForm = useCallback((updater: T | ((prev: T) => T)) => {
    setFormRaw(updater);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`biztrack_draft_${key}`);
    setFormRaw(initialState);
  }, [key, initialState]);

  return { form, setForm, clearDraft, isComposing };
}
