import type { CrawlStatus } from '@concert-crawl/types'
import type { StatusKind } from '@/components/admin/primitives/utils'

/**
 * The four real crawl-run statuses plus the venue-level states the same
 * columns render in their place — a venue can be blocked or paused, or have
 * never run at all, and those appear in the status column alongside run
 * outcomes.
 */
export type CrawlDisplayStatus =
  CrawlStatus | 'blocked' | 'paused' | 'in_progress' | 'never'

interface CrawlStatusDisplay {
  label: string
  kind: StatusKind
}

/**
 * The single source of truth for how a crawl status reads. Four surfaces used
 * to each carry their own map: Admin > Crawl omitted `skipped` entirely so it
 * fell through to gray, while the dashboard coloured it `signal` magenta, and
 * the same venue therefore looked calm on one page and alarming on another.
 *
 * `skipped` is deliberately `neutral`. Page-hash dedup matching is a normal,
 * healthy outcome, and colouring it like a fault trains an operator to ignore
 * the colour that actually means something.
 */
export const CRAWL_STATUS_DISPLAY: Record<
  CrawlDisplayStatus,
  CrawlStatusDisplay
> = {
  success: { label: 'Success', kind: 'success' },
  failed: { label: 'Failed', kind: 'danger' },
  partial: { label: 'Partial', kind: 'warning' },
  skipped: { label: 'Skipped', kind: 'neutral' },
  blocked: { label: 'Blocked', kind: 'danger' },
  paused: { label: 'Paused', kind: 'warning' },
  in_progress: { label: 'Running', kind: 'accent' },
  never: { label: 'Never crawled', kind: 'neutral' },
}

/**
 * `hasOwn` rather than `in`: callers pass a widened `string`, so a value like
 * `toString` would otherwise hit the prototype chain and resolve to a function.
 */
export const isCrawlDisplayStatus = (
  status: string,
): status is CrawlDisplayStatus => Object.hasOwn(CRAWL_STATUS_DISPLAY, status)

/**
 * For the places that colour something other than a badge — the dot on a
 * split-view row, for instance — so they read the same map rather than
 * carrying a second copy of it.
 */
export const crawlStatusKind = (status: string | null): StatusKind => {
  const key = status ?? 'never'
  return isCrawlDisplayStatus(key) ? CRAWL_STATUS_DISPLAY[key].kind : 'neutral'
}
