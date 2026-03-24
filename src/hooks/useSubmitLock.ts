import { useState, useCallback, useRef } from 'react';

/**
 * Prevents double-submission of forms/buttons.
 * Usage: const { locked, withLock } = useSubmitLock();
 * Then: <Button disabled={locked} onClick={() => withLock(handleSave)}>Save</Button>
 */
export function useSubmitLock(cooldownMs = 1500) {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const withLock = useCallback(async (fn: () => Promise<any> | any) => {
    if (locked) return;
    setLocked(true);
    try {
      await fn();
    } finally {
      // Cooldown before re-enabling
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLocked(false), cooldownMs);
    }
  }, [locked, cooldownMs]);

  return { locked, withLock };
}
