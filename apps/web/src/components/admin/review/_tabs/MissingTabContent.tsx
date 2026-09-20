'use client'

import { useCallback, useState } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { Pagination } from '@/components/admin/primitives'
import { MissingTable } from '../missing/MissingTable'
import { MissingMobile } from '../missing/MissingMobile'
import { type MissingRowEvent } from '../missing/MissingRow'
import { MoveConfirmDialog } from '../missing/MoveConfirmDialog'

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
  /**
   * Confirm a suggested relocation. Called only after the admin passes the
   * confirm dialog — the merge deletes a row, moves watch rows and notifies
   * every watcher, none of which is reversible.
   */
  onConfirmMove: (event: MissingRowEvent) => Promise<void>
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
  onConfirmMove,
}: MissingTabContentProps) => {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  // The row awaiting confirmation. Held here rather than per-row so the
  // dialog is mounted once for whichever shell is rendering.
  const [moveTarget, setMoveTarget] = useState<MissingRowEvent | null>(null)

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
  const openMoveConfirm = useCallback((event: MissingRowEvent) => {
    setMoveTarget(event)
  }, [])
  // Close first, then fire: the row carries the pending state, and leaving
  // the dialog up over a row that is already merging reads as unconfirmed.
  const confirmMove = useCallback(() => {
    if (!moveTarget) return
    const event = moveTarget
    setMoveTarget(null)
    setPendingIds((prev) => new Set(prev).add(event.id))
    void onConfirmMove(event).finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(event.id)
        return next
      })
    })
  }, [moveTarget, onConfirmMove])

  if (loading) return <Skeleton />

  // Hide the pager for single-page results (`total <= pageSize` AND
  // `page === 1`). Mount it whenever the user is on `page > 1` so the
  // Pagination component's clamp-sync effect can still fire on invalid
  // deep-links (e.g. ?page=99 with rows:[], total:>0).
  const showPager =
    page !== undefined &&
    pageSize !== undefined &&
    total !== undefined &&
    onPageChange !== undefined &&
    onPageSizeChange !== undefined &&
    (total > pageSize || page > 1)

  const table = isDesktop ? (
    <MissingTable
      events={events}
      nowIso={nowIso}
      onMarkPostponed={wrappedPostponed}
      onMarkCancelled={wrappedCancelled}
      onDismiss={wrappedDismiss}
      onConfirmMove={openMoveConfirm}
      pendingIds={pendingIds}
      total={total}
    />
  ) : (
    <MissingMobile
      events={events}
      nowIso={nowIso}
      onMarkPostponed={wrappedPostponed}
      onMarkCancelled={wrappedCancelled}
      onDismiss={wrappedDismiss}
      onConfirmMove={openMoveConfirm}
      pendingIds={pendingIds}
    />
  )

  // Mounted once for whichever shell rendered, so both return paths below
  // carry it rather than only the paginated one.
  const candidate = moveTarget?.movedCandidate
  const dialog =
    moveTarget && candidate ? (
      <MoveConfirmDialog
        missingTitle={moveTarget.title}
        missingDate={moveTarget.date}
        missingVenueName={moveTarget.venueName}
        candidateTitle={candidate.title}
        candidateDate={candidate.date}
        candidateVenueName={candidate.venueName}
        reason={candidate.reason}
        onCancel={() => setMoveTarget(null)}
        onConfirm={confirmMove}
      />
    ) : null

  if (!showPager)
    return (
      <>
        {table}
        {dialog}
      </>
    )

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
      {dialog}
    </div>
  )
}
