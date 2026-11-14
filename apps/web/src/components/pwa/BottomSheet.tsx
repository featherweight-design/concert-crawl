'use client';

import { useEffect, useId, useRef } from 'react';
import { OVERLAY_COPY } from '@/components/ui/cc-overlay/definitions/copy';
import { useSheetDrag } from '@/lib/hooks/useSheetDrag';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Rendered as an sr-only heading and used as aria-labelledby target. */
  title: string;
  /** Modal width in px from `lg` up. Omit for the default `max-w-md`. */
  maxWidth?: number;
  /** Draws the close as this word (a drawn "Cancel") instead of the X icon. */
  closeText?: string;
  /**
   * Draws the blue-to-pink top edge on the centered dialog too (from `sm`
   * up), not only on the phone sheet. Off by default so every other sheet
   * keeps its plain bordered dialog.
   */
  edgeFromSm?: boolean;
  /**
   * `bare` draws the close as a plain X with no bordered box (inside the same
   * 44px hit area). Default `boxed` keeps the bordered close every other sheet
   * wears.
   */
  closeVariant?: 'boxed' | 'bare';
  /**
   * `tight` is 20px side padding (24px bottom) instead of the default 24px all
   * round, for boards drawn on a 20px gutter.
   */
  inset?: 'default' | 'tight';
  /**
   * Paints the sheet one step lighter than the default: surface-2 on the phone
   * sheet, bg-elevated on the centered dialog (the share boards). Needs
   * `edgeFromSm`, which is what reads the fill.
   */
  raised?: boolean;
  /**
   * Lets the phone sheet grow to 40px under the top of the viewport instead of
   * 85vh, so a board drawn to fit a short screen does. From `sm` up the cap is
   * still 85vh.
   */
  tall?: boolean;
  /**
   * The phone sheet is a fixed 92% of the screen and does not scroll as a
   * whole: the children lay out their own pinned header and a scrolling body
   * (the Add sheet, `04/add-*`). From `sm` up it is the same capped dialog.
   */
  pinned?: boolean;
  /** Draws the 40x4 drag handle above the top row (phone only). */
  handle?: boolean;
  /**
   * A mono eyebrow on the left of the top row, opposite the close, so the two
   * share one row (the Add sheet's CONCERTS and Done).
   */
  eyebrow?: string;
  children: React.ReactNode;
}

// Whole class names, so Tailwind sees each one literally.
const PHONE_EDGE = 'max-lg:sheet-edge';
const DIALOG_PLAIN = 'lg:border lg:border-border lg:bg-surface-1';
const DIALOG_EDGE = 'sheet-edge lg:[--sheet-bg:var(--surface-1)]';
const RAISED_EDGE =
  'sheet-edge [--sheet-bg:var(--surface-2)] lg:[--sheet-bg:var(--bg-elevated)]';

// :not(:disabled) excludes native controls that can't actually receive focus
// (disabled button/input/select/textarea) — otherwise the focus trap sees them
// as focusables and refuses to wrap when they're at either end of the list.
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export const BottomSheet = ({
  open,
  onClose,
  title,
  maxWidth,
  closeText,
  edgeFromSm = false,
  closeVariant = 'boxed',
  inset = 'default',
  raised = false,
  tall = false,
  pinned = false,
  handle = false,
  eyebrow,
  children,
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const titleId = useId();
  const drag = useSheetDrag(onClose, open);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement;
    // The close button is always the first focusable, so focus never stays
    // behind the modal.
    sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusables =
        sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstFocusable = focusables[0];
      const lastFocusable = focusables[focusables.length - 1];
      // If focus is anywhere outside the dialog (never entered, or moved
      // programmatically) Tab would let the user escape the modal — force
      // focus back to the first (or last, on Shift+Tab) focusable inside.
      if (!sheet.contains(document.activeElement)) {
        event.preventDefault();
        if (event.shiftKey) {
          lastFocusable?.focus();
        } else {
          firstFocusable?.focus();
        }
        return;
      }
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // z-[90] puts this in the dialog band alongside ModalShell's scrim. At the
    // old z-50 it sat *below* the persistent feedback edge tab (then z-80, now
    // z-35 under every sheet), which drew over every sheet in the app and
    // clipped controls inside it at narrow widths. A focus-trapping dialog
    // outranks standing chrome.
    <div className="fixed inset-0 z-[90]">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          maxWidth === undefined
            ? drag.sheetStyle
            : ({
                ...drag.sheetStyle,
                '--sheet-max': `${maxWidth}px`,
              } as React.CSSProperties)
        }
        onTransitionEnd={drag.onSheetTransitionEnd}
        // A bottom sheet on mobile, a centered modal from lg up: anchored to the
        // bottom edge of a wide viewport it read as a stray drawer. One media
        // query rather than a second tree, so the focus trap above is shared.
        // The width is a variable, not an interpolated class, so Tailwind
        // still sees both literal class names.
        className={`fixed inset-x-0 bottom-0 ${
          pinned
            ? 'flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden lg:max-h-[85vh]'
            : `${
                tall
                  ? 'max-h-[calc(100dvh-40px)] lg:max-h-[85vh]'
                  : 'max-h-[85vh]'
              } overflow-y-auto`
        } rounded-t-2xl ${
          pinned
            ? 'px-[18px] pb-0 pt-0 lg:px-6'
            : inset === 'tight'
              ? 'px-4 pb-6 pt-5 min-[360px]:px-5'
              : 'p-6'
        } shadow-2xl focus:outline-none lg:inset-0 lg:m-auto lg:h-fit lg:w-full lg:rounded-2xl ${
          edgeFromSm
            ? raised
              ? RAISED_EDGE
              : DIALOG_EDGE
            : `${PHONE_EDGE} ${DIALOG_PLAIN}`
        } ${
          maxWidth === undefined ? 'lg:max-w-md' : 'lg:max-w-[var(--sheet-max)]'
        }`}
      >
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {/* Escape is not a phone gesture, and above a full-height sheet the
            backdrop can be a sliver, so the sheet carries its own close. It
            mirrors the 30px bordered close in ModalShell headers, inside a 44px
            hit area pulled into the padding so the visible box sits in the
            corner. First in DOM order, so it is also where focus lands. The row
            is the drag-down grab zone: no handle is drawn for this sheet, so
            nothing new is visible. */}
        {handle && (
          <div
            className="flex shrink-0 justify-center pt-[11px] lg:hidden"
            {...drag.zoneProps}
          >
            <span
              aria-hidden="true"
              className="h-1 w-10 rounded-full bg-border-strong"
            />
          </div>
        )}
        <div
          className={`flex shrink-0 ${
            eyebrow === undefined
              ? 'justify-end'
              : 'items-center justify-between'
          } ${
            pinned
              ? '-mr-3 lg:mt-6'
              : inset === 'tight'
                ? '-mr-2.5'
                : '-mr-3 -mt-3'
          }`}
          {...drag.zoneProps}
        >
          {eyebrow !== undefined && (
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-signal">
              {eyebrow}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={
              closeText === undefined ? OVERLAY_COPY.close : undefined
            }
            className={`inline-flex h-11 shrink-0 cursor-pointer items-center justify-center bg-transparent text-fg-muted ${
              closeText === undefined
                ? 'w-11'
                : 'min-w-11 px-3 text-[13px] font-semibold'
            }`}
          >
            {closeText === undefined ? (
              closeVariant === 'bare' ? (
                <CloseIcon size={18} />
              ) : (
                <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border">
                  <CloseIcon />
                </span>
              )
            ) : (
              closeText
            )}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const CloseIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 2l8 8M10 2l-8 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);
