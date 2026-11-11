'use client';

import Link from 'next/link';
import { VenueTile } from '@/components/consumer/venue-glyph';
import {
  fmtNum,
  fmtDistance,
  type VenueWithDistance,
} from './venue-filter-defs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const VENUES_INDEX_COPY = CONSUMER_COPY.venuesIndex;

interface VenueRowProps {
  venue: VenueWithDistance;
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
  );
}

function IconPin({
  size = 11,
  dotRadius = 1.2,
}: {
  size?: number;
  dotRadius?: number;
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
  );
}

/** One venue as a card (B+ `bp-venues`): its icon tile, name, where, and counts. */
export function VenueRow({ venue }: VenueRowProps) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block w-full rounded-[14px] border border-border bg-surface-1 transition-colors hover:border-border-strong"
    >
      {/* Desktop layout */}
      <div
        className="hidden lg:grid items-center rounded-[14px] py-3.5 pl-3.5 pr-5 group-hover:bg-overlay-hover transition-colors"
        style={{ gridTemplateColumns: '64px 1fr 120px 120px 24px', gap: 20 }}
      >
        <VenueTile slug={venue.slug} name={venue.name} size={64} />

        <div className="min-w-0">
          <div
            className="truncate text-[21px] font-bold text-fg leading-[1.15]"
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
              fontFamily: 'var(--font-ui)',
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
              fontFamily: 'var(--font-ui)',
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
      <div className="flex lg:hidden items-center gap-3.5 rounded-[14px] py-3 pl-3 pr-4 group-hover:bg-overlay-hover transition-colors">
        <VenueTile slug={venue.slug} name={venue.name} size={56} />
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
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
            }}
          >
            <span className="shrink-0">{fmtDistance(venue.distanceMi)}</span>
            {venue.neighborhood && (
              <>
                <span style={{ color: 'var(--fg-subtle)' }}>·</span>
                <span className="truncate min-w-0">{venue.neighborhood}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
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
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--signal)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {venue.upcomingCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
