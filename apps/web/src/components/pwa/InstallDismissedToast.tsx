'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { INSTALL_COPY } from './definitions/copy';

/** How long the note stays before it clears itself. */
const TOAST_MS = 6000;

interface InstallDismissedToastProps {
  onDone: () => void;
}

/**
 * The note left behind when the install slot is dismissed: it says the slot
 * will stop asking. A status message, so a screen reader hears it without
 * focus moving; it clears itself after a few seconds.
 */
export const InstallDismissedToast = ({
  onDone,
}: InstallDismissedToastProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onDone, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border-strong bg-surface-2 px-4 py-3 text-[15px] leading-snug text-fg shadow-lg md:bottom-6"
    >
      <Check size={18} aria-hidden className="shrink-0 text-success" />
      <span>{INSTALL_COPY.dismissNote}</span>
    </div>
  );
};
