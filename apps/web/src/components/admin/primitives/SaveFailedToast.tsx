'use client';

import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from './AdminButton';

const copy = ADMIN_COPY.states.saveFailed;

/**
 * The toast's buttons as `07/save-failed` and `09/crawl-all-failed-m` both
 * draw them: 30px, 9px corners, 12.5px semibold on the raised surface (they
 * had drifted to the 28px small button).
 */
const TOAST_BUTTON: CSSProperties = {
  height: 30,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg)',
  background: 'var(--surface-2)',
};

/**
 * `07/save-failed`: says what didn't change and what is still saved, with
 * Try again. The control beside it has already snapped back (`useSnapBack`).
 */
type SaveFailedToastProps = {
  /** Left out for a refusal that would only be refused again: no Try again. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Adds a Dismiss beside Try again, as the venue header's notices have. */
  onDismiss?: () => void;
  /**
   * The block's padding. `09/crawl-all-failed-m` draws 12px all round where
   * `07/save-failed` draws 12px 14px.
   */
  padding?: string;
  /** The block's shadow; defaults to `07/save-failed`'s. */
  shadow?: string;
} & (
  | {
      /** The thing that didn't change, e.g. "Crews". */
      what: string;
      title?: never;
    }
  | {
      /** In place of "Couldn't change {what}", for an action that isn't a change. */
      title: string;
      what?: never;
    }
) &
  (
    | {
        /** What is still saved, as a sentence, e.g. "Staging is still Beta." */
        saved: string;
        body?: never;
      }
    | {
        /**
         * The whole second line, in place of "{saved} Nothing changed.", for
         * a failure that says what didn't happen (`09/crawl-all-failed-m`).
         */
        body: string;
        saved?: never;
      }
  );

export const SaveFailedToast = ({
  what,
  title,
  saved,
  body,
  onRetry,
  retrying = false,
  onDismiss,
  // `07/save-failed` draws 12px 14px (it had drifted to 12px 16px).
  padding = '12px 14px',
  // `07/save-failed` draws this shadow; `09/crawl-all-failed-m` draws .45.
  shadow = '0 14px 30px rgba(0,0,0,.4)',
}: SaveFailedToastProps) => (
  <div
    role="alert"
    data-testid="save-failed"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding,
      borderRadius: 12,
      background: 'var(--bg-elevated)',
      border: '1px solid color-mix(in srgb, var(--danger) 45%, transparent)',
      boxShadow: shadow,
    }}
  >
    <X size={16} color="var(--danger)" aria-hidden style={{ flex: 'none' }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Long unbroken text wraps instead of overflowing a phone (as #260). */}
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: 'var(--fg)',
          overflowWrap: 'anywhere',
        }}
      >
        {title ?? copy.title(what ?? '')}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--fg-muted)',
          marginTop: 2,
          overflowWrap: 'anywhere',
        }}
      >
        {body ?? copy.body(saved ?? '')}
      </div>
    </div>
    {onRetry && (
      <AdminButton
        type="button"
        variant="outline"
        size="sm"
        disabled={retrying}
        onClick={onRetry}
        style={TOAST_BUTTON}
      >
        {copy.tryAgain}
      </AdminButton>
    )}
    {onDismiss && (
      <AdminButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onDismiss}
        style={TOAST_BUTTON}
      >
        {copy.dismiss}
      </AdminButton>
    )}
  </div>
);
