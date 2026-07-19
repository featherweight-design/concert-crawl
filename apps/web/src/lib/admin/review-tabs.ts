/**
 * Canonical list of Admin > Review tab keys. Two callers share this source
 * of truth:
 *
 *   - `ReviewPageClient` uses it to validate `?tab=<key>` off the URL and
 *     narrow to `ReviewTabKey` for `activeTab` state.
 *   - `edit-event-link.ts` uses it as the whitelist for the `?from=<tab>`
 *     handoff back from the event editor / Review sub-pages (#1083), so
 *     the topbar breadcrumb + sidebar + mobile bottom bar can rebuild
 *     `/admin/review?tab=<from>` safely.
 *
 * Adding, removing, or renaming a Review tab MUST happen here so both
 * surfaces stay in lock-step — Copilot flagged the drift risk when the
 * whitelist was duplicated across the two files (#1089).
 */
export const REVIEW_TAB_KEYS = [
  'event-flags',
  'prices',
  'missing',
  'all-events',
  'contests',
] as const

export type ReviewTabKey = (typeof REVIEW_TAB_KEYS)[number]

export const REVIEW_TAB_KEYS_SET: ReadonlySet<string> = new Set(REVIEW_TAB_KEYS)

export const isReviewTabKey = (value: string | null): value is ReviewTabKey =>
  value !== null && REVIEW_TAB_KEYS_SET.has(value)
