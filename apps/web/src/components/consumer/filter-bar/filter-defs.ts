import type { VenuePublic } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { venueShort } from '@/components/consumer/definitions/lib';

const copy = CONSUMER_COPY.filterBar;

export type FilterKey = 'when' | 'where' | 'price' | 'vibe';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  label: string;
  placeholder: string;
  queryKey: string;
}

export const FILTER_DEFS: Record<FilterKey, FilterDefinition> = {
  when: {
    label: copy.whenLabel,
    placeholder: copy.whenPlaceholder,
    queryKey: 'filterWhen',
  },
  where: {
    label: copy.whereLabel,
    placeholder: copy.wherePlaceholder,
    queryKey: 'filterWhere',
  },
  price: {
    label: copy.priceLabel,
    placeholder: copy.pricePlaceholder,
    queryKey: 'filterPrice',
  },
  vibe: {
    label: copy.vibeLabel,
    placeholder: copy.vibePlaceholder,
    queryKey: 'filterVibe',
  },
};

const WHEN_OPTIONS: FilterOption[] = [
  { value: 'tonight', label: copy.whenTonight },
  { value: 'this-weekend', label: copy.whenThisWeekend },
  { value: 'this-week', label: copy.whenThisWeek },
  { value: 'next-week', label: copy.whenNextWeek },
];

const PRICE_OPTIONS: FilterOption[] = [
  { value: 'under-25', label: copy.priceUnder25 },
  { value: '25-50', label: copy.price25to50 },
  { value: '50-plus', label: copy.price50Plus },
  { value: 'tbd', label: copy.priceTbd },
];

export const FILTER_ORDER: FilterKey[] = ['when', 'where', 'price', 'vibe'];

/** A venue's name for sorting: a leading "The" is ignored, as the boards do. */
const venueSortName = (name: string): string =>
  name.replace(/^the\s+/i, '').trim();

/**
 * Orders venues by name, ignoring a leading "The" (`bp-f-filt_where_d`:
 * Ball Arena, The Black Box, Bluebird Theater, ...).
 */
export const compareVenueNames = (left: string, right: string): number =>
  venueSortName(left).localeCompare(venueSortName(right));

/**
 * The Vibe popover's and phone sheet's order (`bp-vibe-vibe_pop_d`,
 * `bp-vibe-vibe_sheet_m`), read row by row across the popover's two columns.
 * Every bucket, always: no board hides a bucket without shows.
 */
export const VIBE_ORDER: readonly string[] = [
  'electronic',
  'hip-hop',
  'pop',
  'indie',
  'rock',
  'metal',
  'punk',
  'folk',
  'country',
  'jazz',
  'latin',
  'reggae',
  'jam',
  'world',
  'classical',
  'comedy',
];

/**
 * A genre bucket's display name, in sentence case like every other label:
 * `hip-hop` reads "Hip-hop", never "Hip-Hop". The letter after `&` is
 * capitalised too, since R&B is an initialism. The Vibe filter and the
 * onboarding genre chips both draw it, so the two never disagree.
 */
export function genreLabel(genre: string): string {
  return genre.replace(
    /(^|&)([a-z])/g,
    (_, sep, char) => sep + char.toUpperCase(),
  );
}

export function getFilterOptions(
  key: FilterKey,
  venues: VenuePublic[],
  genres: string[] = [],
): FilterOption[] {
  if (key === 'where') {
    return venues
      .map((venue) => ({ value: venue.slug, label: venue.name }))
      .sort((leftOption, rightOption) =>
        leftOption.label.localeCompare(rightOption.label),
      );
  }

  if (key === 'when') return WHEN_OPTIONS;
  if (key === 'price') return PRICE_OPTIONS;
  return genres.map((genre) => ({ value: genre, label: genreLabel(genre) }));
}

/**
 * Where and Vibe take several values (Design addendum 2, item 6): the page URL
 * repeats the key, and a show matches any chosen venue and any chosen vibe.
 * When and Price stay single-valued.
 */
export const MULTI_FILTER_KEYS: readonly FilterKey[] = ['where', 'vibe'];

export const isMultiFilter = (key: FilterKey): boolean =>
  MULTI_FILTER_KEYS.includes(key);

/** Every dimension's values, a single-valued one as a list of at most one. */
export type FilterValues = Record<FilterKey, readonly string[]>;

/** The dimensions holding at least one value, for "N shows match" and Clear all. */
export function getActiveFilterCount(values: Partial<FilterValues>) {
  return Object.values(values).filter((list) => list.length > 0).length;
}

/** `values` with `value` added, or removed if it was already there. */
export const toggleValue = (
  values: readonly string[],
  value: string,
): string[] =>
  values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];

/**
 * The label of the first pick that resolves, and how many other picks there
 * are. A stale slug (a venue since removed) is skipped for the name but still
 * counted, so "Bluebird +1" stays honest about the URL. Null when no pick
 * resolves, so the segment falls back to its placeholder.
 */
export function getFirstResolvedLabel(
  key: FilterKey,
  values: readonly string[],
  venues: VenuePublic[],
  genres: string[] = [],
): { label: string; rest: number } | null {
  for (const value of values) {
    const label = getActiveFilterLabel(key, value, venues, genres);
    if (label !== null) return { label, rest: values.length - 1 };
  }
  return null;
}

/**
 * The desktop segment's value: the first resolving pick's label, then "+N"
 * for the rest ("Bluebird +1").
 */
export function getSegmentLabel(
  key: FilterKey,
  values: readonly string[],
  venues: VenuePublic[],
  genres: string[] = [],
): string | null {
  const resolved = getFirstResolvedLabel(key, values, venues, genres);
  if (resolved === null) return null;
  return resolved.rest > 0
    ? copy.segment.moreCount(resolved.label, resolved.rest)
    : resolved.label;
}

/**
 * The phone chip's value: one pick reads as its name, several as a count
 * ("2 venues", "2 vibes").
 */
export function getChipLabel(
  key: FilterKey,
  values: readonly string[],
  venues: VenuePublic[],
  genres: string[] = [],
): string | null {
  if (values.length > 1) {
    if (key === 'where') return copy.venueCount(values.length);
    if (key === 'vibe') return copy.vibeCount(values.length);
  }
  return getSegmentLabel(key, values, venues, genres);
}

export function getActiveFilterLabel(
  key: FilterKey,
  value: string,
  venues: VenuePublic[],
  genres: string[] = [],
): string | null {
  if (key === 'vibe') return genreLabel(value);
  if (key === 'where') {
    const venue = venues.find((candidate) => candidate.slug === value);
    return venue ? venueShort(venue.name) : null;
  }
  const match = getFilterOptions(key, venues, genres).find(
    (option) => option.value === value,
  );
  return match?.label ?? null;
}
