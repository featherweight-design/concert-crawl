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

const VIBE_OPTIONS: FilterOption[] = [
  { value: 'rock', label: 'Rock' },
  { value: 'indie', label: 'Indie' },
  { value: 'hip-hop', label: 'Hip-Hop' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'country', label: 'Country' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'pop', label: 'Pop' },
  { value: 'metal', label: 'Metal' },
]

export const FILTER_ORDER: FilterKey[] = ['when', 'where', 'price', 'vibe']

export function getFilterOptions(
  key: FilterKey,
  venues: VenuePublic[],
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
  return VIBE_OPTIONS
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
): string | null {
  const match = getFilterOptions(key, venues).find(
    (option) => option.value === value,
  )
  return match?.label ?? null
}
