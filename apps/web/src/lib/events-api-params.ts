// The one translation from Browse's page-URL params to GET /v1/events query
// params.
//
// The two readers disagreed before this existed: the server component mapped
// `filterWhere` → `venueSlug`, `filterWhen` → `from`/`to` and `filterTaste` /
// `filterFollowing` → `taste` / `following`, while the client's Load More
// forwarded the page URL almost verbatim. `listEventsSchema` is a plain
// (non-strict) Zod object, so the untranslated keys were stripped rather than
// rejected — page 2 came back 200 with unfiltered rows appended to a filtered
// page 1, under a banner still claiming the scope. The schema stays lenient
// (a 400 would break old PWA bundles and cached URLs); the guard is
// EVENTS_QUERY_KEYS instead: the API builds its schema from it and logs any
// other key, and this module's test asserts every key it emits is on the list.
//
// Scope flags are passed in rather than read off the URL: whether a viewer may
// actually hold `taste` or `following` depends on a token and an entitlement,
// which only the caller knows.

import { parseListParam, type EventsQueryKey } from '@concert-crawl/types';
import { filterWhenToDateRange } from '@/components/consumer/definitions/lib';

/** Pagination plus the scope flags, which only the caller can decide. */
export interface EventsApiOptions {
  limit: number;
  offset?: number;
  taste?: boolean;
  following?: boolean;
}

/** The page-URL shape both readers hand in: Next's searchParams, or a URLSearchParams. */
export type BrowseParams =
  Record<string, string | string[] | undefined> | URLSearchParams;

// A repeated key (`?filterVibe=indie&filterVibe=punk`) reaches the two callers
// in different shapes: Next hands the server component an array, while the
// client holds a URLSearchParams. A single-valued param takes the first value
// from either, because anything else reopens the page-1/page-2 scope mismatch
// this module exists to close — from the other side.
const read = (params: BrowseParams, key: string): string | undefined => {
  const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value !== '' ? value : undefined;
};

// Where and Vibe are multi-select (Design addendum 2, item 6), so they read
// EVERY value of a repeated key, from both shapes alike, or the legacy single
// value a bookmark carries. A comma is never a separator in the page URL: the
// filter UI reads these keys with `searchParams.get`, and a comma list would
// show it one value while the request asked for several. `parseListParam` is
// the API's own rule (trim, drop blanks, dedupe, truncate to the cap), so the
// list sent is the list the API applies. The two readers must agree on the
// whole list, not just its head, or Load More appends rows from a different
// venue set than page 1 showed.
const readList = (params: BrowseParams, key: string): string[] =>
  parseListParam(
    params instanceof URLSearchParams ? params.getAll(key) : params[key],
  );

// A list goes out as a repeated key, one entry per value, which the API reads
// as an array. A single value goes out exactly as it always did.
const appendList = (
  qs: URLSearchParams,
  key: EventsQueryKey,
  values: readonly string[],
): void => {
  for (const value of values) qs.append(key, value);
};

/**
 * Build the `/v1/events` query string from Browse's page-URL params.
 *
 * Only keys `listEventsSchema` accepts are emitted, so anything the page adds
 * for its own use (`view`, `weekOffset`, `page`, the `filter*` shorthands)
 * stays out of the request instead of being silently dropped server-side.
 */
export const buildEventsApiParams = (
  params: BrowseParams,
  { limit, offset, taste = false, following = false }: EventsApiOptions,
): URLSearchParams => {
  const qs = new URLSearchParams();

  const search = read(params, 'search');
  if (search) qs.set('search', search);

  // `filterWhere` is the chip. `venueSlug` is accepted too because the server
  // component always did; nothing in the app links with it today.
  const whereList = readList(params, 'filterWhere');
  appendList(
    qs,
    'venueSlug',
    whereList.length > 0 ? whereList : readList(params, 'venueSlug'),
  );

  // `filterWhen` wins over an explicit from/to, which is what the server
  // component always did, and the window is taken as a PAIR. Resolving the two
  // ends independently would let `?from=2026-07-01&filterWhen=this-week` emit
  // an explicit start against the chip's end: a window belonging to neither,
  // under a chip label still claiming the week.
  const filterWhen = read(params, 'filterWhen');
  const range = filterWhen ? filterWhenToDateRange(filterWhen) : null;
  const from = range?.from ?? read(params, 'from');
  const to = range?.to ?? read(params, 'to');
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);

  const filterPrice = read(params, 'filterPrice');
  if (filterPrice) qs.set('filterPrice', filterPrice);

  appendList(qs, 'filterVibe', readList(params, 'filterVibe'));

  if (taste) qs.set('taste', '1');
  if (following) qs.set('following', '1');

  // Offset comes from the caller on the client (React Query's page param) and
  // from the URL on the server. A malformed one is dropped rather than sent —
  // the API would reject the whole request over it.
  const offsetValue = offset ?? Number(read(params, 'offset') ?? NaN);
  if (Number.isSafeInteger(offsetValue) && offsetValue >= 0)
    qs.set('offset', String(offsetValue));

  qs.set('limit', String(limit));
  return qs;
};
