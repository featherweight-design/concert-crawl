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
// see at a glance that a "Success" row actually tripped the went-dark check
// or a 3-failure consecutive auto-pause.
//
// The 'crawl.event_count_dropped' category covers BOTH "went dark" (0
// events) and "dropped sharply" (non-zero but well below baseline) — the
// notification body distinguishes the two. The badge label is therefore
// neutral ("Event drop") so it reads correctly for both cases; operators
// open the notification for the specific severity + numbers.
export const CRAWL_ALERT_BADGES: Record<
  ActiveCrawlAlert['category'],
  CrawlStatusBadgeConfig
> = {
  'crawl.event_count_dropped': {
    label: 'Event drop',
    variant: 'destructive',
  },
  'crawl.failed': {
    label: 'Failing',
    variant: 'destructive',
  },
}
