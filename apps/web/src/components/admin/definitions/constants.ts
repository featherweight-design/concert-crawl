import type { CrawlStatus } from '@concert-crawl/types'
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
