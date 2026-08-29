import { STALE_AFTER_MS } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.priceStaleness

/**
 * One definition of "this price might be out of date", shared by every surface
 * that shows a price.
 *
 * Watching and Event Detail each hand-rolled this with the same 24h threshold
 * but different timestamps — Watching read the event row's `updatedAt`, Event
 * Detail the price's `observedAt` — so the two surfaces could legitimately
 * disagree about the same price (#1366).
 */
export { STALE_AFTER_MS }

export function isPriceStale(observedAt: string | null | undefined): boolean {
  if (!observedAt) return false
  const observed = new Date(observedAt).getTime()
  if (!Number.isFinite(observed)) return false
  return Date.now() - observed > STALE_AFTER_MS
}

export function relTimeAgo(observedAt: string): string {
  const observed = new Date(observedAt).getTime()
  // Without this an unparseable timestamp reads as "just now" — the most
  // reassuring possible answer to a question we cannot actually answer.
  if (!Number.isFinite(observed)) return copy.unknown
  const diff = Date.now() - observed
  // A future observation means clock skew or bad data. Falling through would
  // answer "just now" — the same false reassurance as an unparseable date.
  if (diff < 0) return copy.unknown
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days > 0) return `${days}${copy.daysSuffix}`
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours > 0) return `${hours}${copy.hoursSuffix}`
  const minutes = Math.floor(diff / (60 * 1000))
  if (minutes > 0) return `${minutes}${copy.minutesSuffix}`
  return copy.justNow
}
