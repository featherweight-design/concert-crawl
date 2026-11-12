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

function genreLabel(genre: string): string {
  return genre.replace(
    /(^|[-&])([a-z])/g,
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
 * The desktop segment's value: the first pick's label, then "+N" for the rest
 * ("Bluebird +1"). Null when nothing set resolves to a label, so the segment
 * falls back to its placeholder.
 */
export function getSegmentLabel(
  key: FilterKey,
  values: readonly string[],
  venues: VenuePublic[],
  genres: string[] = [],
): string | null {
  const first = values[0];
  if (first === undefined) return null;
  const label = getActiveFilterLabel(key, first, venues, genres);
  if (label === null) return null;
  return values.length > 1
    ? copy.segment.moreCount(label, values.length - 1)
    : label;
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
