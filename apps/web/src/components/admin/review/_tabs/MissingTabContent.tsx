'use client'

import { useCallback, useState } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { Pagination } from '@/components/admin/primitives'
import { MissingTable } from '../missing/MissingTable'
import { MissingMobile } from '../missing/MissingMobile'
import { type MissingRowEvent } from '../missing/MissingRow'

export interface MissingTabContentProps {
  events: MissingRowEvent[]
  isDesktop: boolean
  nowIso: string
  // When true, render a skeleton instead of the table/cards. Without this
  // gate the empty state ("Nothing's gone missing.") flashes for one paint
  // before the first fetch resolves.
  loading?: boolean
  // Pagination wiring — optional so the mobile shell can pass through the
  // same total/handlers it gets from the parent.
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (next: number) => void
  onPageSizeChange?: (next: number) => void
  onMarkPostponed: (id: string) => Promise<void>
  onMarkCancelled: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}

const Skeleton = () => (
  <div
    aria-busy="true"
    aria-label={ADMIN_COPY.review.missing.skeletonAriaLabel}
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    {Array.from({ length: 5 }).map((_, idx) => (
      <div
        key={idx}
        style={{
          height: 36,
          borderRadius: 8,
          background: 'var(--surface-2)',
          opacity: 0.55,
        }}
      />
    ))}
  </div>
)

export const MissingTabContent = ({
  events,
  isDesktop,
  nowIso,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
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

  if (loading) return <Skeleton />

  // Gate on `total > 0` (not `events.length > 0`) so the pager still mounts
  // when the active page returns no rows (e.g. deep-link to ?page=99). The
  // Pagination component's clamp-sync effect can only fire while mounted.
  const showPager =
    page !== undefined &&
    pageSize !== undefined &&
    total !== undefined &&
    onPageChange !== undefined &&
    onPageSizeChange !== undefined &&
    total > 0

  const table = isDesktop ? (
    <MissingTable
      events={events}
      nowIso={nowIso}
      onMarkPostponed={wrappedPostponed}
      onMarkCancelled={wrappedCancelled}
      onDismiss={wrappedDismiss}
      pendingIds={pendingIds}
    />
  ) : (
    <MissingMobile
      events={events}
      nowIso={nowIso}
      onMarkPostponed={wrappedPostponed}
      onMarkCancelled={wrappedCancelled}
      onDismiss={wrappedDismiss}
      pendingIds={pendingIds}
    />
  )

  if (!showPager) return table

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {table}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="events"
      />
    </div>
  )
}
