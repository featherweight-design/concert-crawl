'use client'

import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface VerifyMarkProps {
  verified: boolean
}

export const VerifyMark = ({ verified }: VerifyMarkProps) => (
  <StatusBadge kind={verified ? 'success' : 'warning'} variant="outline" mono>
    {verified
      ? ADMIN_COPY.editor.status.verified
      : ADMIN_COPY.editor.status.unverified}
  </StatusBadge>
)
