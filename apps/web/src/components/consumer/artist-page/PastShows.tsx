import type { ArtistPastShow } from '@concert-crawl/types';
import Link from 'next/link';
import React from 'react';

import { CRAWL_SINCE } from './definitions/constants';
import { ARTIST_COPY } from './definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { WentPill } from '@/components/consumer/went-pill/WentPill';
import { formatEventDate } from '../definitions/lib';
import { fmtDate } from './DateStamp';
import { SectionHead } from './SectionHead';

interface PastShowsProps {
  name: string;
  past: ArtistPastShow[];
  /** Where "Show older" goes (the next window). Absent: nothing older. */
  olderHref?: string | undefined;
}

/**
 * Deliberately modest: no price, no link out, no photo (a date tile and the
 * venue's icon tile are all the art), and no setlist. Each
 * row ends in the "I went" pill, the one place a past night is stamped from here.
 * `events.setlist` exists but has never carried real data, and setlists were
 * dropped with #1170 (no setlist.fm license), so this block only claims what
 * the crawl saw.
 */
export const PastShows = ({ name, past, olderHref }: PastShowsProps) => {
  if (!past.length) return null;

  return (
    <section aria-label={ARTIST_COPY.pastListAria(name)}>
      <SectionHead
        title={ARTIST_COPY.pastTitle}
        count={ARTIST_COPY.showCount(past.length)}
      />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {past.map((show, index) => {
          const { dow, mon, day } = fmtDate(show.iso);
          const year = show.iso.slice(0, 4);
          return (
            <li
              key={show.eventId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderTop: index === 0 ? undefined : '1px solid var(--border)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-1)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'var(--fg-subtle)',
                }}
              >
                {dow}
                <span
                  style={{
                    fontFamily: 'Inter, system-ui',
                    fontSize: 19,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: 'var(--fg)',
                  }}
                >
                  {day}
                </span>
                {mon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'Inter, system-ui',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--fg)',
                  }}
                >
                  {/* The venue's rounded-square icon tile, as the upcoming
                      rows draw it (artist_past_m), not the round stamp. */}
                  <VenueTile
                    slug={show.venueSlug}
                    name={show.venue}
                    size={24}
                  />
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {show.venue}
                  </span>
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 3,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {show.city ? `${year} · ${show.city}` : year}
                </span>
              </span>
              <WentPill
                eventId={show.eventId}
                artist={name}
                venueSlug={show.venueSlug}
                venueName={show.venue}
                dateLabel={formatEventDate(show.iso, undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                attending={show.attending}
              />
            </li>
          );
        })}
      </ul>
      {olderHref !== undefined && (
        <Link
          href={olderHref}
          scroll={false}
          data-testid="past-show-older"
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-[15px] font-semibold text-fg-muted no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          {ARTIST_COPY.showOlder}
          <svg
            aria-hidden
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 5.5L7 9l3.5-3.5" />
          </svg>
        </Link>
      )}
      <p
        style={{
          margin: '12px 0 0',
          fontFamily: 'Inter, system-ui',
          fontSize: 11.5,
          lineHeight: 1.5,
          color: 'var(--fg-subtle)',
          textWrap: 'pretty',
        }}
      >
        {ARTIST_COPY.pastNote(CRAWL_SINCE)}
      </p>
    </section>
  );
};
