'use client'

import { useCallback, useState } from 'react'
import { MissingTable } from '../missing/MissingTable'
import { MissingMobile } from '../missing/MissingMobile'
import { type MissingRowEvent } from '../missing/MissingRow'

export interface MissingTabContentProps {
  events: MissingRowEvent[]
  isDesktop: boolean
  nowIso: string
  onMarkPostponed: (id: string) => Promise<void>
  onMarkCancelled: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}

export const MissingTabContent = ({
  events,
  isDesktop,
  nowIso,
  onMarkPostponed,
  onMarkCancelled,
  onDismiss,
}: MissingTabContentProps) => {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())

  const wrap = useCallback(
    (handler: (id: string) => Promise<void>) => (id: string) => {
      setPendingIds((prev) => new Set(prev).add(id))
      void handler(id).finally(() => {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
    },
    [],
  )

  const wrappedPostponed = wrap(onMarkPostponed)
  const wrappedCancelled = wrap(onMarkCancelled)
  const wrappedDismiss = wrap(onDismiss)

  if (isDesktop) {
    return (
      <MissingTable
        events={events}
        nowIso={nowIso}
        onMarkPostponed={wrappedPostponed}
        onMarkCancelled={wrappedCancelled}
        onDismiss={wrappedDismiss}
        pendingIds={pendingIds}
      />
    )
  }
  return (
    <MissingMobile
      events={events}
      nowIso={nowIso}
      onMarkPostponed={wrappedPostponed}
      onMarkCancelled={wrappedCancelled}
      onDismiss={wrappedDismiss}
      pendingIds={pendingIds}
    />
  )
}
