'use client'

import { type FC } from 'react'
import { useReviewContestsQuery } from '@/lib/queries/admin-contests'
import { PriceDisputesQueue } from '../PriceDisputesQueue'
import { REVIEW_CONTEST_COPY } from '../definitions/copy'

// Tab body for the Contests review tab. Mounts the queue when there's
// data and surfaces minimal loading / error states off the React Query
// hook. The queue itself auto-hides on empty (spec §7.5 + design
// property table §1 line 15), so we don't render an empty-state message
// here — the tab pill (separate ReviewTabs surface) keeps the (0) badge.
export const ContestsTabContent: FC = () => {
  const { data, isPending, isError, refetch } = useReviewContestsQuery()

  if (isPending) {
    return (
      <div
        role="status"
        style={{
          padding: 16,
          color: 'var(--fg-muted)',
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {REVIEW_CONTEST_COPY.queue.loading}
      </div>
    )
  }

  if (isError) {
    // Retry button mirrors AdminDisputePanel's error banner so the tab
    // body and the detail panel surface the same affordance for the same
    // failure mode. The button styling is inlined (matching the panel)
    // because Tailwind dark: variants don't play with the admin token
    // palette and there's no shared <ErrorBanner> component yet.
    return (
      <div
        role="alert"
        style={{
          padding: '10px 14px',
          borderRadius: 8,
          border:
            '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
          background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
          fontSize: 13,
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span>{REVIEW_CONTEST_COPY.queue.errorHeading}</span>
        <button
          type="button"
          onClick={() => refetch()}
          style={{
            background: 'transparent',
            border: '1px solid currentColor',
            color: 'inherit',
            padding: '6px 12px',
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {REVIEW_CONTEST_COPY.queue.errorRetry}
        </button>
      </div>
    )
  }

  return <PriceDisputesQueue items={data?.items ?? []} />
}
