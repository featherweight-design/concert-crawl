'use client';

import { useId, useRef, type ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useDialogKeyboard } from './useDialogKeyboard';

export interface AdminSheetProps {
  onClose: () => void;
  /** Visible heading, and the sheet's accessible name. */
  title: ReactNode;
  /** The accessible name when `title` is not plain text. */
  label?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Full screen, for anything that needs the keyboard plus a long list
   * (rule 4, plan decision 1). Otherwise a bottom sheet.
   */
  fullScreen?: boolean;
  /** False mid-request: the scrim and Escape stop closing it. */
  dismissible?: boolean;
  /** Paint the footer bottom-up, so its first DOM child sits last. */
  footerReversed?: boolean;
  /**
   * Full screen only: a back link naming the page it returns to, in place of
   * the close button (`06/artist-search-mobile` draws "‹ Artists").
   */
  backLabel?: string;
  /** Full screen without `backLabel` only: a ⋯ menu beside the close button. */
  menu?: ReactNode;
}

/**
 * The phone's sheet. It shares the focus trap with every admin dialog through
 * `useDialogKeyboard`, whose selector excludes disabled controls. Render it
 * only while open.
 */
export const AdminSheet = ({
  onClose,
  title,
  label,
  subtitle,
  children,
  footer,
  fullScreen = false,
  dismissible = true,
  footerReversed = false,
  backLabel,
  menu,
}: AdminSheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogKeyboard(panelRef, onClose, { dismissible });

  return (
    <div
      data-testid="admin-sheet-scrim"
      onClick={(evt) => {
        if (dismissible && evt.target === evt.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: fullScreen ? 'var(--bg)' : 'rgba(0,0,0,0.55)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(label ? { 'aria-label': label } : { 'aria-labelledby': titleId })}
        data-testid="admin-sheet"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: fullScreen ? 0 : undefined,
          maxHeight: fullScreen ? undefined : '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          // Clear the home indicator in a standalone PWA.
          padding: `${fullScreen ? 16 : 8}px 16px calc(22px + env(safe-area-inset-bottom))`,
          background: 'var(--bg-elevated)',
          borderTop: fullScreen ? 'none' : '1px solid var(--border-strong)',
          borderRadius: fullScreen ? 0 : '18px 18px 0 0',
        }}
      >
        {fullScreen && backLabel ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              border: 'none',
              background: 'transparent',
              color: 'var(--fg-muted)',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} aria-hidden />
            {backLabel}
          </button>
        ) : fullScreen ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {menu}
            <button
              type="button"
              onClick={onClose}
              aria-label={ADMIN_COPY.panel.close}
              style={{
                display: 'flex',
                padding: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        ) : (
          <div
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--border)',
              margin: '4px auto',
              flex: 'none',
            }}
          />
        )}
        <div>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--fg)',
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                lineHeight: 1.45,
                color: 'var(--fg-muted)',
                // A byline can carry a long handle with nowhere to break.
                overflowWrap: 'anywhere',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              display: 'flex',
              flexDirection: footerReversed ? 'column-reverse' : 'column',
              gap: 12,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
