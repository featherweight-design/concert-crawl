import type { ActiveCrawlAlert, CrawlStatus } from '@concert-crawl/types'
import type { CrawlStatusBadgeConfig } from '@/types/badge'

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
// see at a glance that a "Success" row actually tripped the went-dark check.
export const CRAWL_ALERT_BADGES: Record<
  ActiveCrawlAlert['category'],
  CrawlStatusBadgeConfig
> = {
  'crawl.event_count_dropped': {
    label: 'Went dark',
    variant: 'destructive',
  },
  'crawl.failed': {
    label: 'Failing',
    variant: 'destructive',
  },
}
