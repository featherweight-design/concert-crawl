'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { isPriceStale, relTimeAgo } from '@/components/consumer/lib/staleness'

const copy = CONSUMER_COPY.priceStaleness

/**
 * The "as of …, could be stale" caption under a price. Shared so every price
 * surface marks staleness identically; Event Detail's multi-tier card had no
 * staleness concept at all, which is why the marker showed on Watching but not
 * on the event page (#1366).
 */
export function StaleStamp({
  observedAt,
}: {
  observedAt: string | null | undefined
}) {
  if (!observedAt) return null
  const stale = isPriceStale(observedAt)
  const rel = relTimeAgo(observedAt)
  const text = stale ? copy.asOfStale(rel) : copy.asOf(rel)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: stale ? 'var(--warning)' : 'var(--fg-subtle)',
        letterSpacing: '0.04em',
      }}
    >
      {stale && (
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
          <circle cx="4" cy="4" r="3" fill="var(--warning)" opacity="0.7" />
        </svg>
      )}
      {text}
    </span>
  )
}
