import {
  REVIEW_TAB_KEYS_SET,
  isReviewTabKey,
  type ReviewTabKey,
} from './review-tabs'

/**
 * Canonical href for the admin event editor.
 * Keep all callers (row menus, inspector, deep links) using this helper so
 * future path changes only need to be made in one place.
 *
 * The optional `from` param records which Review tab the editor was opened
 * from so the topbar breadcrumb and nav links can take the admin back there
 * instead of dropping them on the default Event flags tab (#1083). Callers
 * outside Review can omit it; callers inside Review should pass the active
 * tab key. The tab whitelist lives in `./review-tabs.ts` so it stays in
 * lock-step with `ReviewPageClient`'s `?tab=` validation (Copilot #1089).
 */
export const editEventHref = (eventId: string, from?: ReviewTabKey): string => {
  const base = `/admin/events/${eventId}/edit`
  return from ? `${base}?from=${encodeURIComponent(from)}` : base
}

/**
 * Given the `?from=<tab>` param from the current URL, return the Review href
 * that respects it — or the plain `/admin/review` fallback when there's no
 * signal or the value isn't a known tab. Used by breadcrumbs, the mobile
 * bottom bar, and the sidebar so Review-parented sub-pages route the admin
 * back to the tab they came from (#1083).
 */
export const reviewHrefFromParam = (
  from: string | null | undefined,
): string => {
  if (from && REVIEW_TAB_KEYS_SET.has(from)) {
    return `/admin/review?tab=${encodeURIComponent(from)}`
  }
  return '/admin/review'
}

// Re-export so downstream consumers (breadcrumbs, etc.) can go through
// this file rather than reaching into `./review-tabs.ts` — keeps the
// admin-facing surface of tab helpers in one module.
export { REVIEW_TAB_KEYS_SET, isReviewTabKey }
export type { ReviewTabKey }
