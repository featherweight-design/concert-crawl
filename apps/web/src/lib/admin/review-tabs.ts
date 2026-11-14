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
 * Review keeps one tab. The decision tabs moved to Admin > Needs you (2b),
 * so their keys live in `RETIRED_REVIEW_TABS`; the price tabs moved to
 * Admin > Prices (4d) and `reviewPricesRedirect` sends their URLs there.
 * Adding, removing, or renaming a Review tab MUST happen here so every
 * surface stays in lock-step (#1089).
 */
export const REVIEW_TAB_KEYS = ['all-events'] as const;

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

/** Where the retired all-events tab lands: the 4b Events list. */
export const EVENTS_HREF = '/admin/events';

/** Where the retired Review price tabs land. */
export const PRICES_HREF = '/admin/prices';
export const PRICES_SUBMITTED_HREF = '/admin/prices?tab=submitted';

/**
 * Where a retired Review price URL goes, or null when it is not one:
 * `?tab=prices` (coverage) lands on Prices, and `?tab=submissions` or the
 * legacy `?section=submissions` land on its Submitted prices tab. An explicit
 * `?tab=` wins over `?section=`.
 */
export const reviewPricesRedirect = (
  tab: string | null | undefined,
  section: string | null | undefined,
): string | null => {
  if (tab === 'prices') return PRICES_HREF;
  if (tab === 'submissions') return PRICES_SUBMITTED_HREF;
  if (tab === null || tab === undefined || tab === '') {
    if (section === 'submissions') return PRICES_SUBMITTED_HREF;
  }
  return null;
};

/**
 * True when `/admin/review` should send the admin to Needs you: a retired
 * tab, or no usable `?tab=`. Price URLs are redirected to Prices first by
 * `reviewPricesRedirect`.
 */
export const reviewRedirectsToNeedsYou = (
  tab: string | null | undefined,
): boolean => {
  if (isRetiredReviewTab(tab)) return true;
  return !(tab !== null && tab !== undefined && isReviewTabKey(tab));
};

/**
 * The page redirects everything but a live tab away before this runs, so the
 * single tab is also the fallback for an unknown value.
 */
export const resolveReviewTab = (params: URLSearchParams): ReviewTabKey => {
  const tab = params.get('tab');
  return isReviewTabKey(tab) ? tab : 'all-events';
};
