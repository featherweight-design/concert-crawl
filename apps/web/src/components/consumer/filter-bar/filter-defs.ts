import type { VenuePublic } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.filterBar

export type FilterKey = 'when' | 'where' | 'price' | 'vibe'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDefinition {
  label: string
  placeholder: string
  queryKey: string
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
}

const WHEN_OPTIONS: FilterOption[] = [
  { value: 'tonight', label: copy.whenTonight },
  { value: 'this-weekend', label: copy.whenThisWeekend },
  { value: 'this-week', label: copy.whenThisWeek },
  { value: 'next-week', label: copy.whenNextWeek },
]

const PRICE_OPTIONS: FilterOption[] = [
  { value: 'under-25', label: copy.priceUnder25 },
  { value: '25-50', label: copy.price25to50 },
  { value: '50-plus', label: copy.price50Plus },
  { value: 'tbd', label: copy.priceTbd },
]

export const FILTER_ORDER: FilterKey[] = ['when', 'where', 'price', 'vibe']

function genreLabel(genre: string): string {
  return genre.replace(
    /(^|[-&])([a-z])/g,
    (_, sep, char) => sep + char.toUpperCase(),
  )
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
      )
  }

  if (key === 'when') return WHEN_OPTIONS
  if (key === 'price') return PRICE_OPTIONS
  return genres.map((genre) => ({ value: genre, label: genreLabel(genre) }))
}

export function getActiveFilterCount(
  values: Partial<Record<FilterKey, string>>,
) {
  return Object.values(values).filter(Boolean).length
}

export function getActiveFilterLabel(
  key: FilterKey,
  value: string,
  venues: VenuePublic[],
  genres: string[] = [],
): string | null {
  if (key === 'vibe') return genreLabel(value)
  const match = getFilterOptions(key, venues, genres).find(
    (option) => option.value === value,
  )
  return match?.label ?? null
}
