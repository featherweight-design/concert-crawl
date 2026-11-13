'use client';

import { X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from './AdminButton';

const copy = ADMIN_COPY.states.saveFailed;

/**
 * `07/save-failed`: says what didn't change and what is still saved, with
 * Try again. The control beside it has already snapped back (`useSnapBack`).
 */
type SaveFailedToastProps = {
  /** What is still saved, as a sentence, e.g. "Staging is still Beta." */
  saved: string;
  onRetry: () => void;
  retrying?: boolean;
  /** Adds a Dismiss beside Try again, as the venue header's notices have. */
  onDismiss?: () => void;
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
);

export const SaveFailedToast = ({
  what,
  title,
  saved,
  onRetry,
  retrying = false,
  onDismiss,
}: SaveFailedToastProps) => (
  <div
    role="alert"
    data-testid="save-failed"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 12,
      background: 'var(--bg-elevated)',
      border: '1px solid color-mix(in srgb, var(--danger) 45%, transparent)',
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
        {copy.body(saved)}
      </div>
    </div>
    <AdminButton
      type="button"
      variant="outline"
      size="sm"
      disabled={retrying}
      onClick={onRetry}
    >
      {copy.tryAgain}
    </AdminButton>
    {onDismiss && (
      <AdminButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onDismiss}
      >
        {copy.dismiss}
      </AdminButton>
    )}
  </div>
);
