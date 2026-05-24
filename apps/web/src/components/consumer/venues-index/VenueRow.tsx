'use client'

import Link from 'next/link'
import { VenueIdentityTile } from './VenueIdentityTile'
import {
  fmtNum,
  fmtDistance,
  type VenueWithDistance,
} from './venue-filter-defs'
import { VENUES_INDEX_COPY } from './definitions/copy'

interface VenueRowProps {
  venue: VenueWithDistance
  last?: boolean
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPin({
  size = 11,
  dotRadius = 1.2,
}: {
  size?: number
  dotRadius?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M6 1.5c2 0 3.5 1.5 3.5 3.5 0 2.6-3.5 6-3.5 6S2.5 7.6 2.5 5c0-2 1.5-3.5 3.5-3.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
      <circle cx="6" cy="5" r={dotRadius} fill="currentColor" />
    </svg>
  )
}

export function VenueRow({ venue, last = false }: VenueRowProps) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block w-full"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      {/* Desktop layout */}
      <div
        className="hidden sm:grid items-center px-2 py-4 group-hover:bg-overlay-hover transition-colors"
        style={{ gridTemplateColumns: '88px 1fr 120px 120px 24px', gap: 20 }}
      >
        <VenueIdentityTile name={venue.name} size={72} />

        <div className="min-w-0">
          <div
            className="truncate text-[22px] font-bold text-fg leading-[1.15]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {venue.name}
          </div>
          <div
            className="mt-2 flex items-center gap-2.5"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--fg-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span className="flex items-center gap-[5px] font-semibold text-fg">
              <IconPin />
              {fmtDistance(venue.distanceMi)}
            </span>
            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
            <span>
              {[venue.neighborhood, venue.city].filter(Boolean).join(', ')}
            </span>
          </div>
        </div>

        {/* Capacity stat */}
        <div className="flex flex-col items-end gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              whiteSpace: 'nowrap',
            }}
          >
            {VENUES_INDEX_COPY.statLabels.capacity}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {venue.capacity ? fmtNum(venue.capacity) : '—'}
          </span>
        </div>

        {/* Upcoming stat */}
        <div className="flex flex-col items-end gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              whiteSpace: 'nowrap',
            }}
          >
            {VENUES_INDEX_COPY.statLabels.upcoming}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--signal)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {venue.upcomingCount}
          </span>
        </div>

        {/* Chevron */}
        <div
          className="flex justify-end text-fg-subtle group-hover:text-fg transition-all"
          style={{ transform: 'translateX(0)' }}
        >
          <span className="block transition-transform group-hover:translate-x-0.5">
            <IconChevron />
          </span>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex sm:hidden items-center gap-3.5 px-4 py-3 group-hover:bg-overlay-hover transition-colors">
        <VenueIdentityTile name={venue.name} size={56} />
        <div className="flex-1 min-w-0">
          <div
            className="truncate text-[16px] font-bold text-fg leading-[1.2]"
            style={{ letterSpacing: '-0.015em' }}
          >
            {venue.name}
          </div>
          <div
            className="mt-[5px] flex items-center gap-[7px]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.04em',
              color: 'var(--fg-muted)',
            }}
          >
            <span className="flex items-center gap-[3px] font-semibold text-fg">
              <IconPin size={9} dotRadius={1.1} />
              {fmtDistance(venue.distanceMi)}
            </span>
            <span style={{ color: 'var(--fg-subtle)' }}>·</span>
            <span className="truncate min-w-0">
              {venue.capacity ? fmtNum(venue.capacity) : '—'}{' '}
              {VENUES_INDEX_COPY.statLabels.capacityAbbr}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--signal)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {venue.upcomingCount}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {VENUES_INDEX_COPY.statLabels.shows}
            </span>
          </div>
          <span className="text-fg-subtle">
            <IconChevron />
          </span>
        </div>
      </div>
    </Link>
  )
}
