'use client'

import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export type LifecycleStatus = 'upcoming' | 'postponed' | 'cancelled'

export interface LifecycleBadgeProps {
  status: LifecycleStatus
}

const KIND_BY_STATUS: Record<
  LifecycleStatus,
  'neutral' | 'warning' | 'danger'
> = {
  upcoming: 'neutral',
  postponed: 'warning',
  cancelled: 'danger',
}

const LABEL_BY_STATUS: Record<LifecycleStatus, string> = {
  upcoming: ADMIN_COPY.editor.status.upcoming,
  postponed: ADMIN_COPY.editor.status.postponed,
  cancelled: ADMIN_COPY.editor.status.cancelled,
}

export const LifecycleBadge = ({ status }: LifecycleBadgeProps) => (
  <StatusBadge kind={KIND_BY_STATUS[status]} variant="outline" mono>
    {LABEL_BY_STATUS[status]}
  </StatusBadge>
)
