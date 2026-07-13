import type { InboxItemType } from '@concert-crawl/types'
import type { AttentionSeverity } from '@/components/admin/dashboard/AttentionFeed'

// Per-category presentation: the Lucide icon name (resolved dynamically in the
// row, matching AttentionFeed) and the severity tint. Crawl failures and
// blocked venues are the most urgent (danger); flagged events and pending
// prices are routine triage (warning / signal).
export interface CategoryMeta {
  iconName: string
  severity: AttentionSeverity
}

export const CATEGORY_META: Record<InboxItemType, CategoryMeta> = {
  event_flag: { iconName: 'CalendarCheck', severity: 'warning' },
  price_submission: { iconName: 'DollarSign', severity: 'signal' },
  blocked_venue: { iconName: 'ShieldAlert', severity: 'danger' },
  crawl_failure: { iconName: 'AlertTriangle', severity: 'danger' },
}

// Deterministic category order — matches the API's INBOX_CATEGORIES so the
// filter rail badges line up with the server's unread-count assembly.
export const INBOX_CATEGORY_ORDER: readonly InboxItemType[] = [
  'event_flag',
  'price_submission',
  'blocked_venue',
  'crawl_failure',
]
