'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSheetDrag } from '@/lib/hooks/useSheetDrag';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  CREW_DIALOG_GLOW,
  CREW_EDGE_BACKGROUND,
  CREW_PANEL,
} from './crew-surface';
import { MOBILE_VIEWPORT_QUERY } from '@/lib/definitions/breakpoints';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  mobileFooter?: React.ReactNode;
  children: React.ReactNode;
  /** `fit` sizes the phone sheet to its content (up to 85% of the screen). */
  sheetHeight?: 'tall' | 'short' | 'fit';
  /**
   * `crew` is the Crews sheets' drawn surface: a lighter panel, a cyan-to-pink
   * top edge, a soft glow on desktop and a dim without a blur.
   */
  surface?: 'default' | 'crew';
  /**
   * Draws the blue-to-pink top edge on the desktop dialog (the price sheets'
   * boards, more-p-submit_d and more-p-check_d). Opt in: only the dialogs a
   * board draws it on carry it. The phone sheet has its own edge already.
   */
  desktopTopEdge?: boolean;
  /** Desktop modal width in px (default 520). Wide surfaces (tier picker) pass more. */
  desktopWidth?: number;
  /**
   * The shell is the single modal root in the accessibility tree, so
   * surfaces that change its meaning (payment failure = alertdialog)
   * override the role/labeling here instead of nesting a second dialog.
   */
  role?: 'dialog' | 'alertdialog';
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

/** How far above a sheet's top edge it stops (addendum 6 item 15). */
const SHEET_TOP_GAP = 24;
const SHEET_MAX_HEIGHT = `calc(100% - ${SHEET_TOP_GAP}px)`;
/** The fade above the pinned footer, tall enough to say "there is more". */
const FADE_HEIGHT = 22;

/**
 * Whether the scrolling body has been scrolled (the rail then draws a hairline
 * under it) and whether there is more below (the footer then draws a fade).
 * Watches size and content changes too, so a body that grows or shrinks after
 * a state change updates without a scroll.
 */
function useScrollEdges(active: boolean, isMobile: boolean) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ scrolled: false, more: false });

  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (body === null) return;
    const scrolled = body.scrollTop > 0;
    const more = body.scrollHeight - body.scrollTop - body.clientHeight > 1;
    setEdges((prev) =>
      prev.scrolled === scrolled && prev.more === more
        ? prev
        : { scrolled, more },
    );
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!active) {
      // The shell stays mounted while closed: a reopened sheet starts unscrolled.
      setEdges((prev) =>
        prev.scrolled || prev.more ? { scrolled: false, more: false } : prev,
      );
      return;
    }
    if (body === null) return;
    measure();
    const observers: Array<{ disconnect: () => void }> = [];
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(measure);
      resize.observe(body);
      // At the cap the body's own box stops changing; its content does not.
      for (const child of Array.from(body.children)) resize.observe(child);
      observers.push(resize);
    }
    if (typeof MutationObserver !== 'undefined') {
      const mutation = new MutationObserver(measure);
      mutation.observe(body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      observers.push(mutation);
    }
    return () => observers.forEach((observer) => observer.disconnect());
    // The phone and desktop layouts mount different body elements.
  }, [active, isMobile, measure]);

  return { bodyRef, edges, measure };
}

export function ModalShell({
  open,
  onClose,
  ariaLabel,
  header,
  footer,
  mobileFooter,
  children,
  sheetHeight = 'tall',
  surface = 'default',
  desktopTopEdge = false,
  desktopWidth = 520,
  role = 'dialog',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const drag = useSheetDrag(onClose, open);
  const { bodyRef, edges, measure } = useScrollEdges(open && mounted, isMobile);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    setIsMobile(mql.matches);
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onClose();
        return;
      }
      if (ev.key !== 'Tab') return;
      // Without this, Tab walks out of the dialog and into the page behind the
      // scrim, which is still fully focusable. `aria-modal` tells a screen
      // reader the rest is inert; it does not stop the keyboard.
      const dialog = dialogRef.current;
      if (dialog === null) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      // An empty dialog still traps: focus stays on the container itself.
      if (first === undefined || last === undefined) {
        ev.preventDefault();
        dialog.focus();
        return;
      }
      // Focus opens on the dialog container itself, which is not in `focusable`
      // — Shift+Tab from there would otherwise step backwards out of the modal.
      const active = document.activeElement;
      if (active === dialog) {
        ev.preventDefault();
        (ev.shiftKey ? last : first).focus();
        return;
      }
      if (ev.shiftKey && active !== first) return;
      if (!ev.shiftKey && active !== last) return;
      ev.preventDefault();
      (ev.shiftKey ? last : first).focus();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  useBodyScrollLock(open);

  // Focus stayed on the trigger behind the scrim, so a screen reader carried on
  // reading the page the modal had just covered. Focus lands on the dialog
  // itself rather than its first control, which would skip the heading.
  useEffect(() => {
    if (!open || !mounted) return;
    const trigger = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  // Addendum 6 item 15: the sheet stops 24px below the top of the screen and
  // taller content scrolls inside it. `tall` and `short` keep their floors
  // (85% and 62%), so a normal phone looks as it did; they only grow, up to
  // the cap, when the content needs the room (a 320 x 568 phone).
  const minHeightValue =
    sheetHeight === 'tall'
      ? '85%'
      : sheetHeight === 'short'
        ? '62%'
        : undefined;
  const crew = surface === 'crew';
  // The drawn Crews panel is a lighter navy than the page's elevated ground.
  const panel = crew ? CREW_PANEL : 'var(--bg-elevated)';
  // The pinned footer: --surface-2 with a hairline on top (Crews keeps its own
  // drawn panel), and the fade above it while there is more to scroll.
  const footerBackground = crew ? panel : 'var(--surface-2)';
  const hasFooter = Boolean(isMobile ? (mobileFooter ?? footer) : footer);
  const fade = hasFooter && edges.more && (
    <div
      aria-hidden="true"
      data-testid="modal-fade"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: FADE_HEIGHT,
        pointerEvents: 'none',
        background: `linear-gradient(to bottom, transparent, ${panel})`,
      }}
    />
  );

  // Portalled to the body: triggers live inside clipping and transformed
  // ancestors — the filter rail scrolls horizontally, and a transformed
  // ancestor makes `position: fixed` resolve against that box instead of the
  // viewport, which rendered the gate sheet inside its own chip.
  return createPortal(
    <>
      <div
        data-testid="modal-scrim"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'var(--scrim)',
          // The Crews boards dim the page; they do not blur it.
          ...(crew ? {} : { backdropFilter: 'blur(4px)' }),
        }}
        onClick={onClose}
      />

      {isMobile ? (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role={role}
          aria-modal="true"
          aria-label={ariaLabelledBy === undefined ? ariaLabel : undefined}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          className="sheet-edge"
          style={{
            ['--sheet-bg' as string]: panel,
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            minHeight: minHeightValue,
            maxHeight: SHEET_MAX_HEIGHT,
            zIndex: 100,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...drag.sheetStyle,
          }}
          onTransitionEnd={drag.onSheetTransitionEnd}
        >
          {/* The handle strip and the header are the drag-down grab zone. */}
          <div
            {...drag.zoneProps}
            style={{
              ...drag.zoneProps.style,
              flexShrink: 0,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--border-strong)',
              }}
            />
          </div>
          {header != null && (
            <div
              {...drag.zoneProps}
              style={{
                ...drag.zoneProps.style,
                flexShrink: 0,
                padding: '10px 16px 8px',
                // A hairline under the rail once the body has scrolled; the
                // border is always there (clear until then) so nothing jumps.
                borderBottom: `1px solid ${edges.scrolled ? 'var(--border)' : 'transparent'}`,
              }}
              data-testid="modal-rail"
              data-scrolled={edges.scrolled ? 'true' : 'false'}
            >
              {header}
            </div>
          )}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              ref={bodyRef}
              onScroll={measure}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '6px 18px 18px',
              }}
            >
              {children}
            </div>
            {fade}
          </div>
          {(mobileFooter ?? footer) && (
            <div
              data-testid="modal-footer"
              style={{
                flexShrink: 0,
                // 12px above; 20px plus the safe area below.
                padding: '12px 18px calc(20px + env(safe-area-inset-bottom))',
                borderTop: '1px solid var(--border)',
                background: footerBackground,
              }}
            >
              {mobileFooter ?? footer}
            </div>
          )}
        </div>
      ) : (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role={role}
          aria-modal="true"
          aria-label={ariaLabelledBy === undefined ? ariaLabel : undefined}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            width: desktopWidth,
            maxWidth: 'calc(100% - 64px)',
            maxHeight: 'calc(100% - 80px)',
            // The Crews dialogs draw a cyan-to-pink top edge over a quiet
            // border, a lighter panel and a soft cyan glow.
            ...(crew
              ? {
                  border: '1.5px solid transparent',
                  background: CREW_EDGE_BACKGROUND,
                  boxShadow: `0 32px 80px rgba(0,0,0,0.5), ${CREW_DIALOG_GLOW}`,
                }
              : {
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                }),
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {desktopTopEdge && !crew && (
            <div
              aria-hidden="true"
              data-testid="modal-top-edge"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  'linear-gradient(90deg, var(--signal), var(--accent))',
              }}
            />
          )}
          {header != null && (
            <div
              style={{
                flexShrink: 0,
                padding: '10px 16px 8px',
                ...(crew ? {} : { borderBottom: '1px solid var(--border)' }),
              }}
            >
              {header}
            </div>
          )}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              ref={bodyRef}
              onScroll={measure}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '18px 22px',
              }}
            >
              {children}
            </div>
            {fade}
          </div>
          {footer && (
            <div
              data-testid="modal-footer"
              style={{
                flexShrink: 0,
                padding: '12px 22px 20px',
                borderTop: '1px solid var(--border)',
                background: footerBackground,
              }}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
