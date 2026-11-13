'use client';

import { useEffect } from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';
import { useFocusTrap } from './useFocusTrap';

/**
 * What an aria-modal surface owes the keyboard: Tab stays inside, Escape closes
 * it, and focus goes back to the control that opened it. It also holds the
 * shared page scroll lock, so the page behind does not scroll.
 *
 * `ref` belongs on the dialog itself (see `useFocusTrap`). Pass
 * `escapeCloses: false` while the dialog is busy, so Escape cannot hide the
 * result of an action that is still running.
 */
export function useModalDialog(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  escapeCloses = true,
): void {
  // Declared before the trap on purpose: effects run in order, and the opener
  // must be read before the trap moves focus into the dialog.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  useFocusTrap(ref, open);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open || !escapeCloses) return;
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, escapeCloses, onClose]);
}
