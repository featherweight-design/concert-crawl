import type { VenuePublic } from '@concert-crawl/types'

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
    label: 'When',
    placeholder: 'Any date',
    queryKey: 'filterWhen',
  },
  where: {
    label: 'Where',
    placeholder: 'Any venue',
    queryKey: 'filterWhere',
  },
  price: {
    label: 'How much',
    placeholder: 'Any price',
    queryKey: 'filterPrice',
  },
  vibe: {
    label: 'Vibe',
    placeholder: 'Any vibe',
    queryKey: 'filterVibe',
  },
}

const WHEN_OPTIONS: FilterOption[] = [
  { value: 'tonight', label: 'Tonight' },
  { value: 'this-weekend', label: 'This weekend' },
  { value: 'this-week', label: 'This week' },
  { value: 'next-week', label: 'Next week' },
]

const PRICE_OPTIONS: FilterOption[] = [
  { value: 'under-25', label: 'Under $25' },
  { value: '25-50', label: '$25 - $50' },
  { value: '50-plus', label: '$50+' },
  { value: 'tbd', label: 'Price TBD' },
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
