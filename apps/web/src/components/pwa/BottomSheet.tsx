'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OVERLAY_COPY } from '@/components/ui/cc-overlay/definitions/copy';
import { useSheetDrag } from '@/lib/hooks/useSheetDrag';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  ScrollFade,
  useScrollEdges,
} from '@/components/consumer/modal-shell/sheet-rule';

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
   * Draws the blue-to-pink top edge on the centered dialog too (from `lg`
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
   * round, for boards drawn on a 20px gutter. `phone-tight` is the share
   * sheet's: an 18px gutter on the phone sheet (the close box 18px from the
   * edge too) and the default 24px on the centered dialog, as its boards draw.
   */
  inset?: 'default' | 'tight' | 'phone-tight';
  /**
   * Paints the sheet one step lighter than the default: surface-2 on the phone
   * sheet, bg-elevated on the centered dialog (the share boards). Needs
   * `edgeFromSm`, which is what reads the fill.
   */
  raised?: boolean;
  /**
   * The phone sheet is a fixed 92% of the screen and does not scroll as a
   * whole: the children lay out their own pinned header and a scrolling body
   * (the Add sheet, `04/add-*`). From `lg` up it is the same capped dialog.
   */
  pinned?: boolean;
  /** Draws the 40x4 drag handle above the top row (phone only). */
  handle?: boolean;
  /**
   * A mono eyebrow on the left of the top row, opposite the close, so the two
   * share one row (the Add sheet's CONCERTS and Done).
   */
  eyebrow?: string;
  /**
   * The eyebrow's ink. `signal` (default) keeps the Add sheet's cyan; `muted`
   * draws it in fg-muted; `subtle` draws it in fg-subtle at a wider tracking
   * and lighter weight (the share boards' SHARE THIS SHOW).
   */
  eyebrowTone?: 'signal' | 'muted' | 'subtle';
  /**
   * The event share boards' frame (more-r3-share_m, _m_square, _d), measured
   * off the boards: a 2px rim gone 44px down the sides, the page dimmed by
   * --scrim (the board resolves to about rgba(7,10,26,.8)) under a light
   * blur that keeps the stage's dot grid legible, and a 30px close box with
   * 8px corners and a border-strong line. Needs `edgeFromSm` for the rim.
   */
  shareFrame?: boolean;
  /**
   * The sheet's main action, pinned under a scrolling body (addendum 6 item 15,
   * `15/sheet-short-phone`): --surface-2 with a hairline on top, 12px above and
   * 20px plus the safe area below, and a 22px fade over the body while there is
   * more. The close row stays fixed above the body. Not for `pinned` sheets,
   * which lay out their own header, body and footer.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

// useLayoutEffect warns on the server; the portal host is client-only anyway.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

// The admin theme is a scoped wrapper, not <html>: see CCOverlayHost.
const THEME_SCOPE = '[data-admin-theme]';

// Whole class names, so Tailwind sees each one literally.
const PHONE_EDGE = 'max-lg:sheet-edge';
const DIALOG_PLAIN = 'lg:border lg:border-border lg:bg-surface-1';
const DIALOG_EDGE = 'sheet-edge lg:[--sheet-bg:var(--surface-1)]';
const RAISED_EDGE =
  'sheet-edge [--sheet-bg:var(--surface-2)] lg:[--sheet-bg:var(--bg-elevated)]';
const SHARE_RIM = '[--sheet-edge-w:2px] [--sheet-edge-fade:44px]';
const SCRIM_PLAIN = 'fixed inset-0 bg-black/50';
// 1.5px is CCOverlay's scrim blur: the board's dots stay distinct.
const SCRIM_SHARE = 'fixed inset-0 bg-[var(--scrim)] backdrop-blur-[1.5px]';

// A pinned footer is edge to edge: it cancels the sheet's own padding with a
// negative margin and puts the same padding back inside, so its content lines
// up with the body's. One entry per `inset`; `pinned` sheets lay out their own.
const FOOTER_BLEED = {
  default: '-mx-6 -mb-6 px-6',
  tight: '-mx-4 -mb-6 px-4 min-[360px]:-mx-5 min-[360px]:px-5',
  'phone-tight': '-mx-[18px] -mb-6 px-[18px] lg:-mx-6 lg:px-6',
} as const;

// The hairline under the close row once the body has scrolled (addendum 6
// item 15, as ModalShell's rail). Item 15 is the rule for sheets with a pinned
// main action, so only the `footer` slot draws it. Sheets without a footer
// (Remove, Share Concert Crawl, the iPhone how-to, and Add a show, a pinned
// search list whose only action is Done) keep no rule. The rule spans the
// sheet edge to edge, reaching past its padding by the FOOTER_BLEED amounts.
const RULE_BLEED = {
  default: '-inset-x-6',
  tight: '-inset-x-4 min-[360px]:-inset-x-5',
  'phone-tight': '-inset-x-[18px] lg:-inset-x-6',
} as const;

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
  pinned = false,
  handle = false,
  eyebrow,
  eyebrowTone = 'signal',
  shareFrame = false,
  footer,
  children,
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const titleId = useId();
  const drag = useSheetDrag(onClose, open);
  useBodyScrollLock(open);

  // The sheet is portalled out of wherever it is mounted. Inline, `fixed` and
  // z-[90] only rank inside the nearest stacking context: the event page's
  // ShareButton sits in EventStage's `isolate` hero, so the page's later
  // cards (Your move, Follow all) drew over the share sheet and took its
  // clicks. Resolved in a layout effect so SSR and the first client render
  // agree (no document on the server) and the sheet lands before paint. The
  // admin theme scope wins over the body, as in CCOverlayHost, so an admin
  // sheet keeps its tokens.
  const [host, setHost] = useState<Element | null>(null);
  useIsomorphicLayoutEffect(() => {
    setHost(document.querySelector(THEME_SCOPE) ?? document.body);
  }, []);

  // A pinned sheet lays out its own header, body and footer; the slot is for
  // the sheets that scroll as a whole. The body only exists once the portal
  // host does, so the scroll watchers wait for it.
  const hasFooter = footer !== undefined && !pinned;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const { edges, measure } = useScrollEdges(
    bodyRef,
    open && hasFooter && host !== null,
  );

  useEffect(() => {
    // Waits for the host too: a sheet mounted already open has no DOM to
    // focus until the portal lands.
    if (!open || host === null) return;

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
  }, [open, onClose, host]);

  if (!open || host === null) return null;

  return createPortal(
    // z-[90] puts this in the dialog band alongside ModalShell's scrim. At the
    // old z-50 it sat *below* the persistent feedback edge tab (then z-80, now
    // z-35 under every sheet), which drew over every sheet in the app and
    // clipped controls inside it at narrow widths. A focus-trapping dialog
    // outranks standing chrome.
    //
    // text-fg on the root: portalled, the sheet no longer inherits its colour
    // from the tree it was mounted in. The admin host ([data-admin-theme]) is
    // display:contents and sets no colour, so without this an admin sheet
    // took <body>'s consumer colour. --fg resolves in the host's theme scope.
    <div className="fixed inset-0 z-[90] text-fg" data-testid="sheet-root">
      <div
        className={shareFrame ? SCRIM_SHARE : SCRIM_PLAIN}
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
            ? 'flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden lg:max-h-[calc(100dvh-80px)]'
            : // The sheet stops 24px below the top of the screen and taller
              // content scrolls inside it (addendum 6 item 15); from `lg` up
              // it is the dialog, capped at the window less 80px (ModalShell's
              // calc(100% - 80px) inside its full-window overlay).
              `max-h-[calc(100dvh-24px)] lg:max-h-[calc(100dvh-80px)] ${
                hasFooter ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
              }`
        } rounded-t-2xl ${
          pinned
            ? 'px-[18px] pb-0 pt-0 lg:px-6'
            : inset === 'tight'
              ? 'px-4 pb-6 pt-5 min-[360px]:px-5'
              : inset === 'phone-tight'
                ? 'px-[18px] pb-6 pt-5 lg:p-6'
                : 'p-6'
        } shadow-2xl focus:outline-none lg:inset-0 lg:m-auto lg:h-fit lg:w-full lg:rounded-2xl ${
          edgeFromSm
            ? `${raised ? RAISED_EDGE : DIALOG_EDGE} ${shareFrame ? SHARE_RIM : ''}`
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
                : inset === 'phone-tight'
                  ? // The 30px box sits 7px inside its 44px target.
                    '-mr-[7px] lg:-mr-3 lg:-mt-3'
                  : '-mr-3 -mt-3'
          }`}
          {...drag.zoneProps}
        >
          {eyebrow !== undefined && (
            <span
              className={
                eyebrowTone === 'subtle'
                  ? 'font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-fg-subtle'
                  : `font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] ${eyebrowTone === 'muted' ? 'text-fg-muted' : 'text-signal'}`
              }
            >
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
                <span
                  data-testid="sheet-close-box"
                  className={`inline-flex h-[30px] w-[30px] items-center justify-center border ${
                    shareFrame
                      ? 'rounded-[8px] border-border-strong'
                      : 'rounded-lg border-border'
                  }`}
                >
                  <CloseIcon />
                </span>
              )
            ) : (
              closeText
            )}
          </button>
        </div>
        {!hasFooter ? (
          children
        ) : (
          <>
            <div className="relative flex min-h-0 flex-1 flex-col">
              {/* Always drawn, clear until the body scrolls, as ModalShell. */}
              <span
                aria-hidden="true"
                data-testid="sheet-rule"
                data-scrolled={edges.scrolled ? 'true' : 'false'}
                className={`pointer-events-none absolute top-0 z-[1] h-px ${RULE_BLEED[inset]} ${
                  edges.scrolled ? 'bg-border' : 'bg-transparent'
                }`}
              />
              <div
                ref={bodyRef}
                onScroll={measure}
                data-testid="sheet-body"
                className="min-h-0 flex-1 overflow-y-auto"
              >
                {children}
              </div>
              <ScrollFade
                show={edges.more}
                panel="var(--sheet-bg, var(--surface-1))"
              />
            </div>
            <div
              data-testid="sheet-footer"
              className={`shrink-0 border-t border-border bg-surface-2 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 ${FOOTER_BLEED[inset]}`}
            >
              {footer}
            </div>
          </>
        )}
      </div>
    </div>,
    host,
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
