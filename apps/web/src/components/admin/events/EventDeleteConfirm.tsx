'use client';

import { useId, useState, type CSSProperties } from 'react';
import { Trash2 } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ConfirmDialog, useIsPhone } from '@/components/admin/primitives';
import { foldName } from '@/components/admin/fold-name';
import { deleteRefusalMessage } from './event-delete';

const COPY = ADMIN_COPY.eventDelete;

const SMALL: CSSProperties = { fontSize: 12.5, color: 'var(--fg-muted)' };
const ALERT: CSSProperties = { ...SMALL, color: 'var(--danger)' };

/**
 * Delete… for a show added by hand (E5-b). No board draws it (🔸): it
 * follows `04/delete-venue` on the same `ConfirmDialog` as the venue's
 * Delete, a centred dialog on desktop and a sheet on the phone, with the
 * show's title typed to confirm. The API's 409s say why inside it and hold
 * the confirm, since trying again would be refused again; any other failure
 * says so inside it too (rule 10), so a retry takes the same press.
 */
export const EventDeleteConfirm = ({
  title,
  onDelete,
  onCancel,
  onDone,
}: {
  title: string;
  /** Sends the DELETE; throws the ApiError on a refusal or failure. */
  onDelete: () => Promise<void>;
  onCancel: () => void;
  /** The show is gone: the caller reloads its list or leaves the page. */
  onDone: () => void;
}) => {
  const isPhone = useIsPhone();
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  // Latched on success, so the confirm can't send twice.
  const [done, setDone] = useState(false);

  const confirm = async () => {
    if (done) return;
    setPending(true);
    setError(false);
    let succeeded = false;
    try {
      await onDelete();
      succeeded = true;
    } catch (err: unknown) {
      const refused = deleteRefusalMessage(err);
      if (refused !== null) setRefusal(refused);
      else {
        console.warn('EventDeleteConfirm: delete failed', { title, err });
        setError(true);
      }
    }
    setPending(false);
    if (!succeeded) return;
    setDone(true);
    onDone();
  };

  return (
    <ConfirmDialog
      title={COPY.title(title)}
      confirmLabel={COPY.confirm}
      confirmIcon={Trash2}
      tone="danger"
      confirmVariant="dangerOutline"
      buttonSize="large"
      pending={pending}
      confirmDisabled={
        done || refusal !== null || foldName(typed) !== foldName(title)
      }
      onConfirm={() => void confirm()}
      onCancel={onCancel}
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>{COPY.body}</div>
          <div>
            <label
              htmlFor={inputId}
              style={{
                ...SMALL,
                display: 'block',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              {COPY.field}
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              value={typed}
              onChange={(evt) => setTyped(evt.target.value)}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg)',
                // 16px on the phone or iOS Safari zooms in on focus.
                fontSize: isPhone ? 16 : 13.5,
                color: 'var(--fg)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                width: '100%',
                height: 38,
                padding: '0 12px',
              }}
            />
          </div>
          {refusal !== null && (
            <div role="alert" style={ALERT}>
              {refusal}
            </div>
          )}
          {error && (
            <div role="alert" style={ALERT}>
              {COPY.failed(title)}
            </div>
          )}
        </div>
      }
    />
  );
};
