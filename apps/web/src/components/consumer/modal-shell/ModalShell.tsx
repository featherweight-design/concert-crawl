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
  desktopWidth = 520,
  role = 'dialog',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const drag = useSheetDrag(onClose, open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
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

  const heightValue =
    sheetHeight === 'tall' ? '85%' : sheetHeight === 'short' ? '62%' : 'auto';
  const crew = surface === 'crew';
  // The drawn Crews panel is a lighter navy than the page's elevated ground.
  const panel = crew ? CREW_PANEL : 'var(--bg-elevated)';

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
            height: heightValue,
            maxHeight: sheetHeight === 'fit' ? '85%' : undefined,
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
              }}
            >
              {header}
            </div>
          )}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '6px 18px 18px',
            }}
          >
            {children}
          </div>
          {(mobileFooter ?? footer) && (
            <div
              style={{
                flexShrink: 0,
                padding: '12px 18px 22px',
                borderTop: '1px solid var(--border)',
                background: panel,
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
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '18px 22px',
            }}
          >
            {children}
          </div>
          {footer && (
            <div
              style={{
                flexShrink: 0,
                padding: '14px 22px 18px',
                borderTop: '1px solid var(--border)',
                background: panel,
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
