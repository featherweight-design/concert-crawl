import type { ArtistPastShow } from '@concert-crawl/types';
import React from 'react';

import { CRAWL_SINCE } from './definitions/constants';
import { ARTIST_COPY } from './definitions/copy';
import { VenueStamp } from '@/components/consumer/venue-stamp/VenueStamp';
import { formatEventDate } from '../definitions/lib';
import { fmtDate } from './DateStamp';
import { SectionHead } from './SectionHead';
import { WentPill } from './WentPill';

interface PastShowsProps {
  name: string;
  past: ArtistPastShow[];
}

/**
 * Deliberately modest: no price, no link out, no artwork, and no setlist. Each
 * row ends in the "I went" pill, the one place a past night is stamped from here.
 * `events.setlist` exists but has never carried real data, and setlists were
 * dropped with #1170 (no setlist.fm license), so this block only claims what
 * the crawl saw.
 */
export const PastShows = ({ name, past }: PastShowsProps) => {
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
                  <VenueStamp
                    venueSlug={show.venueSlug}
                    venueName={show.venue}
                    seed={name}
                    size={22}
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
