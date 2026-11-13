'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
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
  /**
   * `large`: 38px buttons with 9px corners and a raised cancel, as the 07
   * confirm boards draw them. Omitted, the buttons keep their 32px size.
   */
  buttonSize?: 'default' | 'large';
  /** True while the action runs: both buttons disable and dismissing stops. */
  pending?: boolean;
  /** Holds only the confirm, e.g. until the venue's name is typed. */
  confirmDisabled?: boolean;
  /** The drawn icon before the confirm label (Hide venue's eye). */
  confirmIcon?: LucideIcon;
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
  buttonSize = 'default',
  pending = false,
  confirmDisabled = false,
  confirmIcon,
  eyebrow = '',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const isPhone = useIsPhone();
  const large =
    buttonSize === 'large'
      ? { height: 38, borderRadius: 9, fontSize: 13.5, fontWeight: 600 }
      : undefined;
  const confirm = (
    <AdminButton
      type="button"
      variant={confirmVariant ?? (tone === 'danger' ? 'danger' : 'primary')}
      {...(confirmIcon && { icon: confirmIcon })}
      disabled={pending || confirmDisabled}
      onClick={onConfirm}
      fullWidth={isPhone}
      style={{ ...large, ...(confirmDisabled && { opacity: 0.45 }) }}
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
      style={
        large && {
          ...large,
          color: 'var(--fg)',
          background: 'var(--surface-2)',
        }
      }
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
