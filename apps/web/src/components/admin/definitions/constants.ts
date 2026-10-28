import type {
  ActiveCrawlAlert,
  AdminFeedbackStatus,
} from '@concert-crawl/types'
import type { StatusKind } from '@/components/admin/primitives/utils'
import { ADMIN_COPY } from './copy'

// Keyed to the Tailwind `sm:` breakpoint (min-width: 640px), so mobile ends at
// 639px — matching TRIAGE_COMPACT_QUERY and the consumer tree. Shared by the
// venues page's table and its Add-venue trigger, which switch layouts together:
// a one-pixel disagreement would card-stack the table while the header still
// showed the desktop button.
export const ADMIN_MOBILE_VIEWPORT_QUERY = '(max-width: 639px)'

// Single source of truth for the feedback status → badge-kind mapping, shared
// by the inbox row (FeedbackRow) and the user-detail feedback history so the
// two views can't drift when a status is added or recoloured. Exhaustive over
// AdminFeedbackStatus — the compiler flags any new status that lacks a kind.
export const FEEDBACK_STATUS_KIND: Record<AdminFeedbackStatus, StatusKind> = {
  unread: 'signal',
  read: 'neutral',
  flagged: 'warning',
  issue_opened: 'danger',
  resolved: 'success',
  archived: 'neutral',
}

// Additive alert pill rendered alongside the status pill in the existing
// CrawlRunHistoryTable (apps/web/src/components/admin/crawl/CrawlSplitView.tsx)
// when an unread admin_alert notification points at the crawl_run (#804).
// Lets an operator see at a glance that a "Success" row actually tripped
// the went-dark check or a 3-failure consecutive auto-pause.
//
// 'crawl.event_count_dropped' covers two failure modes — went-dark (0
// events) and dropped-sharply (non-zero but well below baseline). The API
// threads `severity` through `ActiveCrawlAlert` so we render the specific
// label here instead of a generic "Event drop". Older rows whose metadata
// predates the severity field fall back to the neutral label.
//
// 'crawl.event_ceiling_suspected' (#1185) is a third category and renders
// 'warning' rather than 'danger' — the run succeeded and the data is real,
// it just looks truncated, so it shouldn't read as loud as a dark venue.
//
// 'crawl.url_coverage_gap' is a fourth, also 'warning' and for the same
// reason: the events are correct, only their ticket links are missing. The
// API threads `coverageSeverity` so the badge distinguishes a whole catalogue
// with no links from a partial gap.
//
// `kind` is `StatusKind` rather than a shadcn Badge variant because the
// consumer renders via the admin StatusBadge primitive (matches the visual
// language of the other badges in that table).
export function resolveCrawlAlertBadge(alert: ActiveCrawlAlert): {
  label: string
  kind: StatusKind
} {
  if (alert.category === 'crawl.failed') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelFailing,
      kind: 'danger',
    }
  }
  if (alert.category === 'crawl.event_ceiling_suspected') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelCeilingSuspected,
      kind: 'warning',
    }
  }
  if (alert.category === 'crawl.url_coverage_gap') {
    return {
      label:
        alert.coverageSeverity === 'partial_gap'
          ? ADMIN_COPY.crawlHistoryTable.alertBadgeLabelLinksIncomplete
          : ADMIN_COPY.crawlHistoryTable.alertBadgeLabelLinksMissing,
      kind: 'warning',
    }
  }
  if (alert.severity === 'went_dark') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelWentDark,
      kind: 'danger',
    }
  }
  if (alert.severity === 'dropped_sharply') {
    return {
      label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelDroppedSharply,
      kind: 'danger',
    }
  }
  return {
    label: ADMIN_COPY.crawlHistoryTable.alertBadgeLabelEventDrop,
    kind: 'danger',
  }
}

// The venue crawlWaitUntil values, in the order the admin toggle shows them.
export const WAIT_UNTIL_VALUES = [
  'networkidle',
  'load',
  'domcontentloaded',
] as const
