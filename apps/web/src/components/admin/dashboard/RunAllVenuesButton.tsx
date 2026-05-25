'use client'

import { useTransition } from 'react'
import { AdminButton } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface RunAllVenuesButtonProps {
  action: () => Promise<void>
}

export const RunAllVenuesButton = ({ action }: RunAllVenuesButtonProps) => {
  const [isPending, startTransition] = useTransition()

  return (
    <AdminButton
      variant="primary"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await action()
        })
      }}
    >
      {isPending
        ? ADMIN_COPY.dashboard.runAllVenuesButton.pending
        : ADMIN_COPY.dashboard.runAllVenuesButton.idle}
    </AdminButton>
  )
}
