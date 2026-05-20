import type { VenuePublic } from '@concert-crawl/types'

export type VenueFilterKey = 'sort' | 'capacity' | 'distance'

export interface VenueFilterOption {
  value: string
  label: string
}

export interface VenueFilterDef {
  label: string
  placeholder: string
  alwaysOn?: boolean
  options: VenueFilterOption[]
}

export const VENUE_FILTER_DEFS: Record<VenueFilterKey, VenueFilterDef> = {
  sort: {
    label: 'Sort',
    placeholder: 'Most upcoming shows',
    alwaysOn: true,
    options: [
      { value: 'upcoming', label: 'Most upcoming shows' },
      { value: 'distance', label: 'Nearest first' },
      { value: 'cap-desc', label: 'Largest capacity' },
      { value: 'cap-asc', label: 'Smallest capacity' },
      { value: 'alpha', label: 'Alphabetical' },
    ],
  },
  capacity: {
    label: 'Capacity',
    placeholder: 'Any capacity',
    options: [
      { value: 'intimate', label: 'Intimate (< 500)' },
      { value: 'club', label: 'Club (500 – 1,500)' },
      { value: 'mid', label: 'Mid-size (1,500 – 4,000)' },
      { value: 'large', label: 'Large (4,000 – 10,000)' },
      { value: 'arena', label: 'Arena (10,000+)' },
    ],
  },
  distance: {
    label: 'Distance',
    placeholder: 'Any distance',
    options: [
      { value: 'walking', label: 'Walking (< 1 mi)' },
      { value: 'near', label: 'Nearby (< 5 mi)' },
      { value: 'metro', label: 'Metro (< 15 mi)' },
      { value: 'far', label: 'Day trip (15+ mi)' },
    ],
  },
}

export const VENUE_FILTER_ORDER: VenueFilterKey[] = [
  'sort',
  'capacity',
  'distance',
]

export interface VenueFilterState {
  sort: string
  capacity: string | null
  distance: string | null
}

export const VENUE_FILTER_DEFAULT: VenueFilterState = {
  sort: 'upcoming',
  capacity: null,
  distance: null,
}

// Haversine distance in miles between two lat/lng points
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusMiles = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aa =
    sinDLat * sinDLat +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      sinDLng *
      sinDLng
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}

// LoDo centroid fallback (used when geolocation is denied)
export const LODO_LAT = 39.7508
export const LODO_LNG = -104.9997

export function fmtDistance(miles: number): string {
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`
}

export function fmtNum(num: number): string {
  return num.toLocaleString('en-US')
}

export function venueChipLabel(
  key: VenueFilterKey,
  value: string | null,
): string {
  const def = VENUE_FILTER_DEFS[key]
  if (!value) return def.placeholder
  return (
    def.options.find((opt) => opt.value === value)?.label ?? def.placeholder
  )
}

export type VenueWithDistance = VenuePublic & { distanceMi: number }

export function applyVenueFilters(
  venues: VenueWithDistance[],
  state: VenueFilterState,
): VenueWithDistance[] {
  let out = venues

  if (state.capacity) {
    out = out.filter((venue) => {
      const cap = venue.capacity ?? 0
      switch (state.capacity) {
        case 'intimate':
          return cap < 500
        case 'club':
          return cap >= 500 && cap < 1500
        case 'mid':
          return cap >= 1500 && cap < 4000
        case 'large':
          return cap >= 4000 && cap < 10000
        case 'arena':
          return cap >= 10000
        default:
          return true
      }
    })
  }

  if (state.distance) {
    out = out.filter((venue) => {
      switch (state.distance) {
        case 'walking':
          return venue.distanceMi < 1
        case 'near':
          return venue.distanceMi < 5
        case 'metro':
          return venue.distanceMi < 15
        case 'far':
          return venue.distanceMi >= 15
        default:
          return true
      }
    })
  }

  return [...out].sort((aa, bb) => {
    switch (state.sort) {
      case 'distance':
        return aa.distanceMi - bb.distanceMi
      case 'cap-desc':
        return (bb.capacity ?? 0) - (aa.capacity ?? 0)
      case 'cap-asc':
        return (aa.capacity ?? 0) - (bb.capacity ?? 0)
      case 'alpha':
        return aa.name.localeCompare(bb.name)
      default:
        return bb.upcomingCount - aa.upcomingCount
    }
  })
}
