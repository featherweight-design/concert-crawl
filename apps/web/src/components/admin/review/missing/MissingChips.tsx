'use client'

import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface MissingChipsProps {
  missedCount: number
}

export const MissingChips = ({ missedCount }: MissingChipsProps) => {
  const missedKind = missedCount >= 4 ? 'danger' : 'warning'
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <StatusBadge kind={missedKind} variant="outline">
        {ADMIN_COPY.review.missing.chipMissed(missedCount)}
      </StatusBadge>
      <StatusBadge kind="neutral" variant="outline">
        {ADMIN_COPY.review.missing.chipCadence}
      </StatusBadge>
    </div>
  )
}
