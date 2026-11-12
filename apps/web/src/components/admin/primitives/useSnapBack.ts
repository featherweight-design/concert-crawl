'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SnapBack<T> {
  /** What the control shows: the pending value while saving, else the saved one. */
  value: T;
  saving: boolean;
  /** Set when the last save failed; the control already shows the saved value. */
  failed: { attempted: T; saved: T } | null;
  /** Show `next` at once, save it, and snap back if the save throws. */
  save: (next: T) => Promise<void>;
  /** Re-attempt the save that failed. */
  retry: () => Promise<void>;
  dismiss: () => void;
}

/**
 * A save that fails snaps back (rule 10): the control returns to what is
 * really saved, and the caller shows `SaveFailedToast` with Try again. Never
 * a spinner that hangs.
 */
export const useSnapBack = <T>(
  saved: T,
  persist: (next: T) => Promise<void>,
): SnapBack<T> => {
  const [savedValue, setSavedValue] = useState(saved);
  const [pending, setPending] = useState<{ value: T } | null>(null);
  const [failed, setFailed] = useState<SnapBack<T>['failed']>(null);
  const savedRef = useRef(saved);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // A fresh server value (a refresh, another tab) becomes the truth.
  useEffect(() => {
    savedRef.current = saved;
    setSavedValue(saved);
  }, [saved]);

  const save = useCallback(async (next: T) => {
    setFailed(null);
    setPending({ value: next });
    try {
      await persistRef.current(next);
      savedRef.current = next;
      setSavedValue(next);
    } catch {
      setFailed({ attempted: next, saved: savedRef.current });
    } finally {
      setPending(null);
    }
  }, []);

  const retry = useCallback(async () => {
    if (failed) await save(failed.attempted);
  }, [failed, save]);

  return {
    value: pending ? pending.value : savedValue,
    saving: pending !== null,
    failed,
    save,
    retry,
    dismiss: () => setFailed(null),
  };
};
