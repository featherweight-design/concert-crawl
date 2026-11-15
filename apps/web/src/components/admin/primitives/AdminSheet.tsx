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
  /**
   * Bottom sheet: a row above the title with a close button at its end
   * (`23/checks-resolved-detail-m` draws the kind label and answer there).
   * Form page: the kind label on its own row above the title.
   */
  eyebrow?: ReactNode;
  /**
   * Full screen only: the phone form page (`gap-1-merge-duplicates/merge-*`):
   * the app's page background, a 22px title, and the footer as a pinned bar
   * on `--bg-elevated` with a rule above it.
   */
  formPage?: boolean;
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
  eyebrow,
  formPage: formPageProp = false,
}: AdminSheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogKeyboard(panelRef, onClose, { dismissible });
  const formPage = fullScreen && formPageProp;

  return (
    <div
      data-testid="admin-sheet-scrim"
      // The app's ambient page background (globals.css), as the board draws.
      className={formPage ? 'page-ambient' : undefined}
      onClick={(evt) => {
        if (dismissible && evt.target === evt.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        ...(!formPage && {
          background: fullScreen ? 'var(--bg)' : 'rgba(0,0,0,0.55)',
        }),
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
          // A form page's pinned footer bar carries the bottom inset itself.
          padding: formPage
            ? '12px 16px 0'
            : `${fullScreen ? 16 : 8}px 16px calc(22px + env(safe-area-inset-bottom))`,
          background: formPage ? 'transparent' : 'var(--bg-elevated)',
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
            {/* A form page's back link draws 14px at 1.8 on a 16 box: 2.7 on
                lucide's 24 (`artist-search-mobile`, `merge-compare`). Other
                full screens keep their 16px chevron. */}
            {formPage ? (
              <ChevronLeft size={14} strokeWidth={2.7} aria-hidden />
            ) : (
              <ChevronLeft size={16} aria-hidden />
            )}
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
        {!fullScreen && eyebrow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {eyebrow}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={onClose}
              aria-label={ADMIN_COPY.panel.close}
              style={{
                display: 'flex',
                // A bigger tap target than the drawn 16px glyph, same place.
                padding: 8,
                margin: -8,
                border: 'none',
                background: 'transparent',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              {/* The board's 1.5 on a 16 box, on lucide's 24. */}
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        )}
        {formPage && eyebrow && <div>{eyebrow}</div>}
        <div>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--fg)',
              overflowWrap: 'anywhere',
              ...(formPage && {
                fontSize: 22,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }),
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
              ...(formPage && {
                flex: 'none',
                // Edge to edge across the panel's 16px gutter.
                margin: '0 -16px',
                padding: '12px 16px calc(24px + env(safe-area-inset-bottom))',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }),
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
