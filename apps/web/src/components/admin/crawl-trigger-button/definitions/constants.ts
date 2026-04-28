import type { CrawlStatus } from '@concert-crawl/types'
import type { CrawlStatusBadgeConfig } from './types'

export const POLL_INTERVAL_MS = 2000

export const DEFAULT_TIME_ZONE = 'America/Denver'

export const CRAWL_STATUS_BADGES: Record<CrawlStatus, CrawlStatusBadgeConfig> =
  {
    success: { label: 'Success', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
    partial: { label: 'Partial', variant: 'secondary' },
  }
