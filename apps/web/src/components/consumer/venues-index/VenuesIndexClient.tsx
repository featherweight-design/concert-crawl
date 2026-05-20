'use client'

import { useEffect, useState } from 'react'
import type { VenuePublic } from '@concert-crawl/types'
import { VenueFeatureCard } from './VenueFeatureCard'
import { VenueFilterBar } from './VenueFilterBar'
import { VenueRow } from './VenueRow'
import {
  LODO_LAT,
  LODO_LNG,
  VENUE_FILTER_DEFAULT,
  applyVenueFilters,
  haversineDistance,
  type VenueFilterState,
  type VenueWithDistance,
} from './venue-filter-defs'

interface VenuesIndexClientProps {
  venues: VenuePublic[]
}

export function VenuesIndexClient({ venues }: VenuesIndexClientProps) {
  const [filterState, setFilterState] =
    useState<VenueFilterState>(VENUE_FILTER_DEFAULT)
  const [userLat, setUserLat] = useState<number>(LODO_LAT)
  const [userLng, setUserLng] = useState<number>(LODO_LNG)

  // Request geolocation once on mount; fall back silently to LoDo centroid
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
      },
      () => {
        /* permission denied or unavailable — keep LoDo centroid */
      },
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  const venuesWithDistance: VenueWithDistance[] = venues.map((venue) => ({
    ...venue,
    distanceMi:
      venue.lat != null && venue.lng != null
        ? haversineDistance(userLat, userLng, venue.lat, venue.lng)
        : haversineDistance(userLat, userLng, LODO_LAT, LODO_LNG),
  }))

  const filtersActive = !!filterState.capacity || !!filterState.distance
  const filtered = applyVenueFilters(venuesWithDistance, filterState)
  const featured = filtersActive
    ? null
    : (filtered.find((venue) => venue.featured) ?? null)
  const listVenues = featured
    ? filtered.filter((venue) => venue !== featured)
    : filtered

  return (
    <>
      {/* Filter bar */}
      <div className="mb-7">
        <VenueFilterBar state={filterState} onChange={setFilterState} />
      </div>

      {/* Flagship card */}
      {featured && (
        <div className="mb-8">
          <VenueFeatureCard venue={featured} />
        </div>
      )}

      {/* Column headers — desktop only */}
      {listVenues.length > 0 && (
        <div
          className="hidden sm:grid px-2 py-5 border-b border-border"
          style={{
            gridTemplateColumns: '88px 1fr 120px 120px 24px',
            gap: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          <div />
          <div>Venue</div>
          <div style={{ textAlign: 'right' }}>Capacity</div>
          <div style={{ textAlign: 'right' }}>Upcoming</div>
          <div />
        </div>
      )}

      {/* Venue list */}
      {listVenues.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-1 sm:rounded-none sm:border-0 sm:bg-transparent">
          {listVenues.map((venue, idx) => (
            <VenueRow
              key={venue.id}
              venue={venue}
              last={idx === listVenues.length - 1}
            />
          ))}
        </div>
      ) : !featured ? (
        <div className="py-20 text-center">
          <div className="text-[18px] font-bold tracking-tight text-fg">
            No venues match.
          </div>
          <div className="mt-1.5 text-[14px] text-fg-muted">
            Loosen a filter or two and they&apos;ll come back.
          </div>
          <button
            type="button"
            onClick={() =>
              setFilterState((prev) => ({
                ...prev,
                capacity: null,
                distance: null,
              }))
            }
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-[12.5px] font-semibold text-fg-muted hover:text-fg transition-colors"
          >
            × Clear filters
          </button>
        </div>
      ) : null}
    </>
  )
}
