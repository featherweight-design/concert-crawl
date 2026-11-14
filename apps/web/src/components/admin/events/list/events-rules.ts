import type { ShowStatusChip } from '@/components/consumer/StatusChip';

/**
 * The Events list's statuses, in the API's names (`GET /v1/admin/events/list`):
 * one per show, in the words fans see. Hidden is a flag, never a status.
 */
export const EVENT_LIST_STATUSES = [
  'available',
  'soldout',
  'postponed',
  'cancelled',
  'delisted',
  'played',
] as const;
export type EventListStatus = (typeof EVENT_LIST_STATUSES)[number];

export const isEventListStatus = (value: unknown): value is EventListStatus =>
  typeof value === 'string' &&
  (EVENT_LIST_STATUSES as readonly string[]).includes(value);

/**
 * Upcoming's Any status popover rows, in `06/status-filter`'s order. Moved
 * waits for Hugh (4b#1); Played is a Past status.
 */
export const STATUS_FILTER_OPTIONS = [
  'available',
  'soldout',
  'postponed',
  'cancelled',
  'delisted',
] as const;

/** Past's Any status menu rows, in `36/past-status-menu-d`'s order. */
export const PAST_STATUS_FILTER_OPTIONS = [
  'played',
  'cancelled',
  'postponed',
  'delisted',
] as const;

/** The statuses a side's filter offers. */
export const statusFilterOptions = (when: When): readonly EventListStatus[] =>
  when === 'past' ? PAST_STATUS_FILTER_OPTIONS : STATUS_FILTER_OPTIONS;

/** A guard for one side's statuses, so a URL never carries the other's. */
export const isFilterStatusFor =
  (when: When) =>
  (value: string): value is EventListStatus =>
    statusFilterOptions(when).some((status) => status === value);

/** Each status's chip on the fan `StatusChip` (admin rule 3). */
export const STATUS_CHIP: Record<EventListStatus, ShowStatusChip> = {
  available: 'available',
  soldout: 'soldout',
  postponed: 'postponed',
  cancelled: 'cancelled',
  delisted: 'removed',
  played: 'played',
};

export type When = 'upcoming' | 'past';

export interface EventFilters {
  query: string;
  when: When;
  venueIds: string[];
  /** Only the side's own statuses (`statusFilterOptions`). */
  statuses: EventListStatus[];
  noPrice: boolean;
  hidden: boolean;
}

export const EMPTY_FILTERS: EventFilters = {
  query: '',
  when: 'upcoming',
  venueIds: [],
  statuses: [],
  noPrice: false,
  hidden: false,
};

const csv = (raw: string | null): string[] => [
  ...new Set(
    (raw ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== ''),
  ),
];

const flag = (raw: string | null): boolean => raw === '1' || raw === 'true';

// The API turns a malformed venue id into a 400, so a hand-edited URL drops
// it here rather than failing the whole list into Couldn't load.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The most venues one list filters by, so the URL and the API query stay
 * bounded. The URL keeps the first 50; the picker disables the rest.
 */
export const MAX_VENUE_FILTER = 50;

/**
 * The page's URL (`/admin/events?q=&when=past&venueIds=&statuses=&noPrice=1&hidden=1`)
 * as filters. Past draws venue and status filters but no No price or Hidden
 * chips (`36/past-d`), so on Past those two are dropped rather than applied
 * unseen, as is a status the side doesn't offer.
 */
export const filtersFromParams = (
  params: Pick<URLSearchParams, 'get'>,
): EventFilters => {
  const when: When = params.get('when') === 'past' ? 'past' : 'upcoming';
  const past = when === 'past';
  return {
    query: (params.get('q') ?? '').trim(),
    when,
    venueIds: csv(params.get('venueIds'))
      .filter((id) => UUID.test(id))
      .slice(0, MAX_VENUE_FILTER),
    statuses: csv(params.get('statuses')).filter(isFilterStatusFor(when)),
    noPrice: !past && flag(params.get('noPrice')),
    hidden: !past && flag(params.get('hidden')),
  };
};

/** The filters as the page's URL params, leaving out every default. */
export const filtersToParams = (filters: EventFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.query.trim() !== '') params.set('q', filters.query.trim());
  if (filters.when === 'past') params.set('when', 'past');
  if (filters.venueIds.length > 0)
    params.set('venueIds', filters.venueIds.join(','));
  if (filters.statuses.length > 0)
    params.set('statuses', filters.statuses.join(','));
  if (filters.when === 'past') return params;
  if (filters.noPrice) params.set('noPrice', '1');
  if (filters.hidden) params.set('hidden', '1');
  return params;
};

export const eventsListHref = (filters: EventFilters): string => {
  const search = filtersToParams(filters).toString();
  return search === '' ? '/admin/events' : `/admin/events?${search}`;
};

/**
 * The filters as `GET /v1/admin/events/list`'s query. The one place the
 * page's names become the API's, so a renamed parameter cannot silently widen
 * the list.
 */
export const apiParams = (
  filters: EventFilters,
  offset: number,
  limit: number,
): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.query.trim() !== '') params.set('query', filters.query.trim());
  params.set('when', filters.when);
  if (filters.venueIds.length > 0)
    params.set('venueIds', filters.venueIds.join(','));
  if (filters.statuses.length > 0)
    params.set('statuses', filters.statuses.join(','));
  if (filters.when === 'upcoming') {
    if (filters.noPrice) params.set('noPrice', 'true');
    if (filters.hidden) params.set('hidden', 'true');
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params;
};

/** True when anything narrows the list beyond its side (Upcoming or Past). */
export const hasFilters = (filters: EventFilters): boolean =>
  filters.query.trim() !== '' ||
  filters.venueIds.length > 0 ||
  filters.statuses.length > 0 ||
  filters.noPrice ||
  filters.hidden;

/**
 * The "Show N" a popover offers: the ticked rows' counts added up, as the
 * board adds Postponed 6 and Cancelled 9 into Show 15. The counts are faceted
 * (each leaves out only its own filter), so the sum is exactly what Apply
 * shows. Nothing ticked shows `unticked`, the rows the other filters allow.
 */
export const showCount = (
  chosen: readonly string[],
  countOf: (key: string) => number,
  unticked: number,
): number =>
  chosen.length === 0
    ? unticked
    : chosen.reduce((sum, key) => sum + countOf(key), 0);

const MONTH_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const monthDay = (
  date: string,
): { year: string; month: string; day: string } | null => {
  const match = MONTH_DAY.exec(date);
  if (!match) return null;
  const [, year = '', month, day] = match;
  // Noon UTC of that calendar day, so the month cannot slip across a zone.
  const at = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
  );
  return {
    year,
    month: at.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    day: String(Number(day)),
  };
};

/**
 * The dates a page of past shows spans, as `36/past-d`'s footer writes them:
 * "Nov 4–8", "Oct 30–Nov 8", or "Nov 8" for one day; across a year, both
 * years: "Dec 30, 2025–Jan 2, 2026". Null for a bad date.
 */
export const dateSpan = (oldest: string, newest: string): string | null => {
  const from = monthDay(oldest);
  const to = monthDay(newest);
  if (from === null || to === null) return null;
  if (oldest === newest) return `${to.month} ${to.day}`;
  if (from.year !== to.year)
    return `${from.month} ${from.day}, ${from.year}–${to.month} ${to.day}, ${to.year}`;
  return from.month === to.month
    ? `${from.month} ${from.day}–${to.day}`
    : `${from.month} ${from.day}–${to.month} ${to.day}`;
};

const dollars = (value: string | null): string | null => {
  if (value === null || value.trim() === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const whole = Number.isInteger(amount);
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * A show's price as the board writes it: "$65–$495", "$15", "$89.50–$1,250".
 * Null when there is no price, which each surface words its own way.
 */
export const formatPrice = (
  min: string | null,
  max: string | null,
): string | null => {
  const low = dollars(min);
  if (low === null) return null;
  const high = dollars(max);
  return high === null || high === low ? low : `${low}–${high}`;
};
