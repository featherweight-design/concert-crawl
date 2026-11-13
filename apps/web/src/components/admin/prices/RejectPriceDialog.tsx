'use client';

import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, AdminDialog } from '@/components/admin/primitives';
import {
  REJECTION_REASONS,
  priceRange,
  type RejectionReason,
} from './submitted-rules';
import type { SubmittedRow } from './submitted-api';

const COPY = ADMIN_COPY.pricesSubmitted.reject;

const chipStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1px solid transparent' : '1px solid var(--border)',
  background: on
    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
    : 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
});

interface RejectPriceDialogProps {
  row: SubmittedRow;
  /** Saves the rejection; resolves with the error text when it was refused. */
  onConfirm: (reason: RejectionReason, note: string) => Promise<string | null>;
  onCancel: () => void;
}

/**
 * `06/reject-a-submitted-price`: pick one reason, add an optional note to the
 * fan, Reject price. The reason is required, since the fan sees it.
 */
export const RejectPriceDialog = ({
  row,
  onConfirm,
  onCancel,
}: RejectPriceDialogProps) => {
  const noteId = useId();
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (reason === null) return;
    setBusy(true);
    setError(null);
    const refused = await onConfirm(reason, note.trim());
    setBusy(false);
    if (refused !== null) setError(refused);
  };

  return (
    <AdminDialog
      accent="var(--danger)"
      label={COPY.title(priceRange(row.priceMin, row.priceMax), row.title)}
      eyebrow={COPY.eyebrow}
      heading={COPY.title(priceRange(row.priceMin, row.priceMax), row.title)}
      width={520}
      dismissible={!busy}
      onDismiss={onCancel}
      footer={
        <>
          <AdminButton variant="outline" disabled={busy} onClick={onCancel}>
            {COPY.cancel}
          </AdminButton>
          <AdminButton
            variant="dangerOutline"
            disabled={busy || reason === null}
            onClick={() => void confirm()}
          >
            {COPY.confirm}
          </AdminButton>
        </>
      }
    >
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}
      >
        {COPY.body(row.handle)}
      </p>
      <div role="group" aria-label={COPY.reasonLabel} style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--fg-muted)',
            marginBottom: 6,
          }}
        >
          {COPY.reasonLabel}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REJECTION_REASONS.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={reason === code}
              disabled={busy}
              onClick={() => setReason(code)}
              style={chipStyle(reason === code)}
            >
              {COPY.reasons[code]}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label
          htmlFor={noteId}
          style={{
            display: 'block',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--fg-muted)',
            marginBottom: 6,
          }}
        >
          {COPY.noteLabel}
        </label>
        <input
          id={noteId}
          maxLength={500}
          disabled={busy}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          style={{
            width: '100%',
            height: 38,
            padding: '0 12px',
            borderRadius: 10,
            fontSize: 13.5,
            color: 'var(--fg)',
            background: 'var(--bg)',
            border: '1px solid var(--border-strong)',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {error && (
        <div
          role="alert"
          style={{ marginTop: 12, fontSize: 13, color: 'var(--danger-fg)' }}
        >
          {error}
        </div>
      )}
    </AdminDialog>
  );
};
