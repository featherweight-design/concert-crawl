'use client';

import type { ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from './AdminButton';
import { AdminDialog } from './AdminDialog';
import { AdminSheet } from './AdminSheet';
import { useIsPhone } from './useIsPhone';

export interface ConfirmDialogProps {
  title: string;
  body?: ReactNode;
  /** Names the action, e.g. "Pause crawling". Never "OK" or "Confirm". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for a step that can't be undone or that notifies fans. */
  tone?: 'default' | 'danger';
  /**
   * The redesign's drawn buttons: `gradient` (Reactivate) or `dangerOutline`
   * (Revoke) for confirm, with an outlined cancel beside it. Omitted, the
   * buttons follow `tone` as before.
   */
  confirmVariant?: 'gradient' | 'dangerOutline';
  /** True while the action runs: both buttons disable and dismissing stops. */
  pending?: boolean;
  eyebrow?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A confirmation that notifies fans or can't be undone (rule 4): a centred
 * dialog on desktop, a sheet on the phone. Render it only while open.
 */
export const ConfirmDialog = ({
  title,
  body,
  confirmLabel,
  cancelLabel = ADMIN_COPY.confirm.cancel,
  tone = 'default',
  confirmVariant,
  pending = false,
  eyebrow = '',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const isPhone = useIsPhone();
  const confirm = (
    <AdminButton
      type="button"
      variant={confirmVariant ?? (tone === 'danger' ? 'danger' : 'primary')}
      disabled={pending}
      onClick={onConfirm}
      fullWidth={isPhone}
    >
      {confirmLabel}
    </AdminButton>
  );
  const cancel = (
    <AdminButton
      type="button"
      variant={confirmVariant ? 'outline' : 'ghost'}
      disabled={pending}
      onClick={onCancel}
      fullWidth={isPhone}
    >
      {cancelLabel}
    </AdminButton>
  );

  if (isPhone) {
    return (
      <AdminSheet
        title={title}
        subtitle={body}
        onClose={onCancel}
        dismissible={!pending}
        footerReversed
        footer={
          // Cancel comes first in the DOM, so the trap opens on it rather than
          // on an action that may be irreversible; it still renders below.
          <>
            {cancel}
            {confirm}
          </>
        }
      >
        {null}
      </AdminSheet>
    );
  }

  return (
    <AdminDialog
      accent={tone === 'danger' ? 'var(--danger)' : 'var(--signal)'}
      label={title}
      eyebrow={eyebrow}
      heading={title}
      dismissible={!pending}
      onDismiss={onCancel}
      footer={
        <>
          {cancel}
          {confirm}
        </>
      }
    >
      {body && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
          }}
        >
          {body}
        </div>
      )}
    </AdminDialog>
  );
};
