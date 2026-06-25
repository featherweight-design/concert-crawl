import type { ActiveCrawlAlert, CrawlStatus } from '@concert-crawl/types'
import type { CrawlStatusBadgeConfig } from '@/types/badge'
import { ADMIN_COPY } from './copy'

export const CRAWL_STATUS_BADGES: Record<CrawlStatus, CrawlStatusBadgeConfig> =
  {
    success: { label: 'Success', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
    partial: { label: 'Partial', variant: 'secondary' },
    // outline (transparent bg + colored border) keeps skipped visually
    // distinct from partial (filled secondary) while reading as muted.
    skipped: { label: 'Skipped', variant: 'outline' },
  }

// Additive alert pill rendered alongside the status pill when an unread
// admin_alert notification points at this crawl_run (#804). Lets an operator
// see at a glance that a "Success" row actually tripped the went-dark check
// or a 3-failure consecutive auto-pause.
//
// 'crawl.event_count_dropped' covers two failure modes — went-dark (0
// events) and dropped-sharply (non-zero but well below baseline). The API
// threads `severity` through `ActiveCrawlAlert` so we render the specific
// label here instead of a generic "Event drop". Older rows whose metadata
// predates the severity field fall back to the neutral label.
export function resolveCrawlAlertBadge(
  alert: ActiveCrawlAlert,
): CrawlStatusBadgeConfig {
  if (alert.category === 'crawl.failed') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelFailing,
      variant: 'destructive',
    }
  }
  if (alert.severity === 'went_dark') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelWentDark,
      variant: 'destructive',
    }
  }
  if (alert.severity === 'dropped_sharply') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelDroppedSharply,
      variant: 'destructive',
    }
  }
  return {
    label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelEventDrop,
    variant: 'destructive',
  }
}
