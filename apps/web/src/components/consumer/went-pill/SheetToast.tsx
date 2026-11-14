'use client';

// The toast that lives INSIDE a sheet (addendum 3 README 40, boards
// `04/add-tapped-d`, `add-unmark-m`, `add-tap-failed-m`): a card above the
// sheet's bottom edge, one at a time, cleared when the sheet closes. The
// house toaster draws at the viewport's bottom centre, which is behind a sheet
// this tall and outlives it, so a sheet that wants its own mounts a provider
// and a host. A control that can sit in a sheet (the went pill) asks for the
// context and falls back to the house toaster when there is none.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { VenueStamp } from '@/components/consumer/venue-stamp';

/** Long enough to read and act on, as the house toasts are. */
export const SHEET_TOAST_MS = 6000;

export interface SheetToastData {
  message: string;
  /** The venue stamp the stamped toast draws in place of a check. */
  stamp?: { venueSlug: string; venueName: string };
  /** The one action on the right: Undo, Retry. */
  action?: { label: string; onClick: () => void };
  /** A failure reads as an alert; the rest are polite status. */
  tone?: 'status' | 'error';
}

interface SheetToastApi {
  /** False when the sheet has already closed, so the caller can fall back. */
  show: (toast: SheetToastData) => boolean;
  clear: () => void;
}

const SheetToastContext = createContext<SheetToastApi | null>(null);

/** The enclosing sheet's toast, or null where there is no sheet. */
export const useSheetToast = (): SheetToastApi | null =>
  useContext(SheetToastContext);

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    stroke="var(--success, #5ee08a)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0"
  >
    <path d="M3.5 9.5l3.6 3.6 7.4-8" />
  </svg>
);

const WarnIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    stroke="var(--price-text-danger)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0"
  >
    <path d="M9 2.5 1.8 15h14.4L9 2.5Z M9 7.5v3.5 M9 13.2v.01" />
  </svg>
);

/**
 * Owns the one toast and clears it when `open` goes false, so a toast never
 * outlives its sheet. Render a `SheetToastHost` inside the sheet.
 */
export const SheetToastProvider = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => {
  const [toast, setToast] = useState<SheetToastData | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const show = useCallback((next: SheetToastData) => {
    // A pill outlives its sheet when a request is still in flight at close;
    // say so, so it can raise the house toast instead of a silent no-op.
    if (!mounted.current) return false;
    // A new toast replaces the last (ruling 7); a fresh object restarts the timer.
    setToast({ ...next });
    return true;
  }, []);
  const clear = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!open) setToast(null);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), SHEET_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ show, clear }), [show, clear]);
  return (
    <SheetToastContext.Provider value={api}>
      {children}
      <SheetToastHostView toast={toast} onDone={clear} />
    </SheetToastContext.Provider>
  );
};

const SheetToastHostView = ({
  toast,
  onDone,
}: {
  toast: SheetToastData | null;
  onDone: () => void;
}) => (
  // Always mounted so assistive tech sees the live region before it speaks.
  <div
    // One stable region: only `aria-live` changes with the tone, so assistive
    // tech sees the same node speak rather than a role swap.
    role="status"
    aria-live={toast?.tone === 'error' ? 'assertive' : 'polite'}
    className="pointer-events-none absolute inset-x-4 bottom-6 z-20"
  >
    {toast && (
      <div
        data-testid="sheet-toast"
        className="pointer-events-auto flex items-center gap-3 rounded-[14px] border px-3.5 py-3 text-[13.5px] leading-[1.4]"
        style={{
          background: 'var(--surface-2)',
          borderColor: 'var(--border-strong)',
          color: 'var(--fg)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {toast.stamp ? (
          <VenueStamp
            venueSlug={toast.stamp.venueSlug}
            venueName={toast.stamp.venueName}
            size={28}
          />
        ) : toast.tone === 'error' ? (
          <WarnIcon />
        ) : (
          <CheckIcon />
        )}
        <span className="min-w-0 flex-1">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDone();
            }}
            className="min-h-11 shrink-0 cursor-pointer border-0 bg-transparent px-1 text-[13.5px] font-extrabold"
            style={{ color: 'var(--signal)' }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
    )}
  </div>
);
