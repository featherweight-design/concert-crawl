'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isIosSafari,
  isStandalone,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa/beforeinstallprompt';
import { dismissOnce, getDismissalState } from '@/lib/pwa/install-dismissal';
import { INSTALL_COPY } from './definitions/copy';
import { IosHowToSheet } from './IosHowToSheet';
import { InstallDismissedToast } from './InstallDismissedToast';
import { gradientEdge } from './definitions/styles';

export const InstallSlot = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden until we know
  const [sheetOpen, setSheetOpen] = useState(false);
  // Set only by the × in this session, so the note shows once, right after.
  const [justDismissed, setJustDismissed] = useState(false);
  const clearNote = useCallback(() => setJustDismissed(false), []);

  useEffect(() => {
    if (isStandalone()) return;
    setIsIos(isIosSafari());
    setDismissed(getDismissalState() !== 'active');

    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferred(event);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const onTap = useCallback(async () => {
    if (isIos && !deferred) {
      setSheetOpen(true);
      return;
    }
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch (err) {
      console.error('InstallSlot: prompt failed', err);
    } finally {
      setDeferred(null);
    }
  }, [deferred, isIos]);

  // Hidden if the user quieted or retired the slot, if the app is standalone,
  // or if the browser hasn't fired beforeinstallprompt AND we're not iOS Safari
  // (nothing to show).
  if (dismissed)
    return justDismissed ? <InstallDismissedToast onDone={clearNote} /> : null;
  if (!deferred && !isIos) return null;

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onTap}
          aria-label={INSTALL_COPY.slotAria}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-transparent px-3 text-[13px] font-bold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{ background: gradientEdge('var(--surface-1)') }}
        >
          {/* Small download-glyph — aria-hidden because the button label above carries it. */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="text-signal"
          >
            <path
              d="M7 2v7M7 9L4 6M7 9l3-3M2 12h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">{INSTALL_COPY.slotLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            dismissOnce();
            setDismissed(true);
            setJustDismissed(true);
          }}
          aria-label={INSTALL_COPY.dismissAria}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-fg-subtle hover:text-fg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <IosHowToSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};
