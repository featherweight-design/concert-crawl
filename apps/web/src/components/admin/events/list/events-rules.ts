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
}

export const EMPTY_FILTERS: EventFilters = { query: '', when: 'upcoming' };

/** The page's URL (`/admin/events?q=&when=past`) as filters. */
export const filtersFromParams = (
  params: Pick<URLSearchParams, 'get'>,
): EventFilters => ({
  query: (params.get('q') ?? '').trim(),
  when: params.get('when') === 'past' ? 'past' : 'upcoming',
});

/** The filters as the page's URL params, leaving out every default. */
export const filtersToParams = (filters: EventFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.query.trim() !== '') params.set('q', filters.query.trim());
  if (filters.when === 'past') params.set('when', 'past');
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
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params;
};

/** True when anything narrows the list beyond its side (Upcoming or Past). */
export const hasFilters = (filters: EventFilters): boolean =>
  filters.query.trim() !== '';

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
