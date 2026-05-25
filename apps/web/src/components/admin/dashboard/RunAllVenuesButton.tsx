'use client'

import { useTransition } from 'react'
import { AdminButton } from '@/components/admin/primitives'
import { COPY } from './definitions/copy'

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
        ? COPY.runAllVenuesButton.pending
        : COPY.runAllVenuesButton.idle}
    </AdminButton>
  )
}
