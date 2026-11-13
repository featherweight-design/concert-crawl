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
 * Review keeps three tabs. The decision tabs moved to Admin > Needs you
 * (2b), so their keys live in `RETIRED_REVIEW_TABS` instead. Adding,
 * removing, or renaming a Review tab MUST happen here so every surface
 * stays in lock-step (#1089).
 */
export const REVIEW_TAB_KEYS = ['prices', 'submissions', 'all-events'] as const;

export type ReviewTabKey = (typeof REVIEW_TAB_KEYS)[number];

export const REVIEW_TAB_KEYS_SET: ReadonlySet<string> = new Set(
  REVIEW_TAB_KEYS,
);

export const isReviewTabKey = (value: string | null): value is ReviewTabKey =>
  value !== null && REVIEW_TAB_KEYS_SET.has(value);

/**
 * Review tabs that now live in Needs you. `/admin/review` redirects these
 * (and a missing `?tab=`) to `/admin/needs-you`, and `?from=<key>` handoffs
 * with one of them resolve there too. The single source for both.
 */
export const RETIRED_REVIEW_TABS = [
  'event-flags',
  'missing',
  'contests',
] as const;

export const RETIRED_REVIEW_TABS_SET: ReadonlySet<string> = new Set(
  RETIRED_REVIEW_TABS,
);

export const isRetiredReviewTab = (value: string | null | undefined): boolean =>
  value !== null && value !== undefined && RETIRED_REVIEW_TABS_SET.has(value);

/** Where retired tabs and a tab-less `/admin/review` land. */
export const NEEDS_YOU_HREF = '/admin/needs-you';

/**
 * True when `/admin/review` should send the admin to Needs you: a retired
 * tab, or no usable `?tab=`. The legacy `?section=submissions` is the one
 * tab-less URL that stays on Review.
 */
export const reviewRedirectsToNeedsYou = (
  tab: string | null | undefined,
  section: string | null | undefined,
): boolean => {
  if (isRetiredReviewTab(tab)) return true;
  if (tab !== null && tab !== undefined && isReviewTabKey(tab)) return false;
  return section !== 'submissions';
};

/**
 * `?section=submissions` predates the tab split and used to land on `prices`,
 * which then smooth-scrolled to a `#submissions-section` anchor. Submissions is
 * now its own tab, so the legacy URL resolves straight to it. The page
 * redirects a tab-less URL to Needs you before this runs, so the `prices`
 * fallback only guards the client against an unknown value.
 */
export const resolveReviewTab = (params: URLSearchParams): ReviewTabKey => {
  const tab = params.get('tab');
  if (isReviewTabKey(tab)) return tab;
  if (params.get('section') === 'submissions') return 'submissions';
  return 'prices';
};
