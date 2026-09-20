'use client'

import { Pause, X, Check, ArrowRightLeft } from 'lucide-react'
import { AdminButton } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface MissingRowMenuProps {
  eventId: string
  onMarkPostponed: (id: string) => void
  onMarkCancelled: (id: string) => void
  onDismiss: (id: string) => void
  /** Omitted when the matcher found no relocation candidate for this row. */
  onConfirmMove?: () => void
  stacked?: boolean
  disabled?: boolean
}

export const MissingRowMenu = ({
  eventId,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
  onConfirmMove,
  stacked = false,
  disabled = false,
}: MissingRowMenuProps) => (
  <div
    style={{
      display: 'flex',
      gap: 6,
      flexDirection: stacked ? 'column' : 'row',
      width: stacked ? '100%' : 'auto',
    }}
  >
    {onConfirmMove && (
      <AdminButton
        variant="primary"
        size="sm"
        icon={ArrowRightLeft}
        fullWidth={stacked}
        disabled={disabled}
        onClick={onConfirmMove}
      >
        {ADMIN_COPY.review.missing.actionConfirmMove}
      </AdminButton>
    )}
    <AdminButton
      variant="outline"
      size="sm"
      icon={Pause}
      fullWidth={stacked}
      disabled={disabled}
      onClick={() => onMarkPostponed(eventId)}
    >
      {ADMIN_COPY.review.missing.actionPostponed}
    </AdminButton>
    <AdminButton
      variant="outline"
      size="sm"
      icon={X}
      fullWidth={stacked}
      disabled={disabled}
      onClick={() => onMarkCancelled(eventId)}
    >
      {ADMIN_COPY.review.missing.actionCancelled}
    </AdminButton>
    <AdminButton
      variant="ghost"
      size="sm"
      icon={Check}
      fullWidth={stacked}
      disabled={disabled}
      onClick={() => onDismiss(eventId)}
    >
      {ADMIN_COPY.review.missing.actionDismiss}
    </AdminButton>
  </div>
)
