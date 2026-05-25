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
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const VENUES_INDEX_COPY = CONSUMER_COPY.venuesIndex

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
      {/* Page heading — reactive to filtered count */}
      <div className="mb-[18px] flex flex-wrap items-baseline gap-[10px] sm:gap-[14px]">
        <h1 className="m-0 text-[28px] font-extrabold text-fg sm:text-[40px] [letter-spacing:-0.03em] sm:[letter-spacing:-0.035em]">
          {VENUES_INDEX_COPY.pageHeading}
        </h1>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--fg-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {filtered.length} {VENUES_INDEX_COPY.venueCountSuffix}
        </span>
      </div>

      {/* Filter bar */}
      <div className="mb-7">
        <VenueFilterBar state={filterState} onChange={setFilterState} />
      </div>

      {/* Flagship card */}
      {featured && (
        <div className="mb-[18px] sm:mb-8">
          <VenueFeatureCard venue={featured} />
        </div>
      )}

      {/* Column headers — desktop only */}
      {listVenues.length > 0 && (
        <div
          className="hidden sm:grid px-2 border-b border-border"
          style={{
            paddingTop: 20,
            paddingBottom: 10,
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
          <div>{VENUES_INDEX_COPY.columnHeaders.venue}</div>
          <div style={{ textAlign: 'right' }}>
            {VENUES_INDEX_COPY.columnHeaders.capacity}
          </div>
          <div style={{ textAlign: 'right' }}>
            {VENUES_INDEX_COPY.columnHeaders.upcoming}
          </div>
          <div />
        </div>
      )}

      {/* Venue list */}
      {listVenues.length > 0 ? (
        <div>
          {listVenues.map((venue, idx) => (
            <VenueRow
              key={venue.id}
              venue={venue}
              last={idx === listVenues.length - 1}
            />
          ))}
        </div>
      ) : !featured ? (
        <div className="py-[60px] sm:py-20 text-center px-6 sm:px-0">
          <div className="text-[16px] sm:text-[18px] font-bold text-fg sm:[letter-spacing:-0.01em]">
            {VENUES_INDEX_COPY.emptyState.heading}
          </div>
          <div className="mt-[5px] sm:mt-1.5 text-[13px] sm:text-[14px] text-fg-muted">
            {VENUES_INDEX_COPY.emptyState.body}
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
            className="mt-[14px] sm:mt-4 inline-flex items-center gap-1.5 rounded-full border border-border-strong px-[13px] sm:px-3.5 py-[7px] sm:py-2 text-[12px] sm:text-[12.5px] font-semibold text-fg-muted hover:text-fg transition-colors"
          >
            {VENUES_INDEX_COPY.emptyState.clearButton}
          </button>
        </div>
      ) : null}
    </>
  )
}
