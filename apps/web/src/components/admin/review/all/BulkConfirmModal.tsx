'use client'

import { AdminButton, AdminDialog } from '@/components/admin/primitives'

export interface BulkConfirmCopy {
  eyebrow: string
  heading: (count: number) => string
  body: string
  confirm: (count: number) => string
  cancel: string
}

export interface BulkConfirmModalProps {
  copy: BulkConfirmCopy
  count: number
  accent: string
  confirmVariant?: 'danger' | 'outline'
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

export const BulkConfirmModal = ({
  copy,
  count,
  accent,
  confirmVariant = 'outline',
  onCancel,
  onConfirm,
  pending = false,
}: BulkConfirmModalProps) => (
  <AdminDialog
    accent={accent}
    label={copy.heading(count)}
    eyebrow={copy.eyebrow}
    heading={copy.heading(count)}
    width={480}
    dismissible={!pending}
    onDismiss={onCancel}
    footer={
      <>
        <AdminButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          {copy.cancel}
        </AdminButton>
        <AdminButton
          type="button"
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={pending}
        >
          {copy.confirm(count)}
        </AdminButton>
      </>
    }
  >
    <div
      style={{
        marginTop: 12,
        fontSize: 13,
        color: 'var(--fg-muted)',
        lineHeight: 1.6,
      }}
    >
      {copy.body}
    </div>
  </AdminDialog>
)
