'use client';

import Link from 'next/link';
import { Panel } from '@/components/consumer/image-slot';
import { GenreChips } from '@/components/consumer/GenreChips';
import {
  formatDollars,
  formatShowTime,
} from '@/components/consumer/definitions/lib';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import type { CachedEvent, CachedVenue } from '@/lib/pwa/cached-content';
import { OFFLINE_COPY } from './definitions/copy';

interface CachedShortcutsProps {
  events: CachedEvent[];
  venues: CachedVenue[];
}

const MAX_EVENTS = 6;
const MAX_VENUES = 6;
const ROW_ART = 48;

const SECTION_LABEL_CLASS =
  'text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle';

// The date shown when a cached row has no show time: venue name plus a short
// date. A bare YYYY-MM-DD is anchored at midday so `new Date` doesn't read it
// as UTC midnight and show the previous day in Mountain time.
const shortDate = (date: string): string | null => {
  // A timestamp is a real instant, shown in Mountain time. A bare date has no
  // zone: read it at UTC midday and format it in UTC so no device zone can move
  // it to a neighbouring day.
  const bare = !date.includes('T');
  const parsed = new Date(bare ? `${date}T12:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: bare ? 'UTC' : 'America/Denver',
  });
};

/** "8:00 PM · Globe Hall", or "Globe Hall · Aug 14" when no time was cached. */
export const formatEventLine = (event: CachedEvent): string => {
  const time = formatShowTime(event.showTime ?? null);
  if (time) return `${time} · ${event.venue.name}`;
  const short = shortDate(event.date);
  return short ? `${event.venue.name} · ${short}` : event.venue.name;
};

/** The price slot: Browse's whole-dollar rounding, or the quiet "tba". */
const formatPrice = (raw: string | null | undefined): string => {
  const value = raw == null ? Number.NaN : Number.parseFloat(raw);
  if (Number.isNaN(value)) return OFFLINE_COPY.fallback.priceTba;
  return value === 0 ? OFFLINE_COPY.fallback.free : formatDollars(value);
};

// One saved night, drawn the way Browse draws it (B+ `bp-s-offline_m`): the
// genre-coloured left edge, ringed artwork, the line, one genre chip and the
// price. A link to the event page, which the service worker has cached.
const CachedEventRow = ({ event }: { event: CachedEvent }) => {
  const ring = genreColor(event.genre?.[0]) ?? NEUTRAL_GENRE_COLOR;
  const name = event.artist ?? event.title;
  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        data-testid="cached-event-row"
        className="flex min-h-[44px] items-center gap-3.5 rounded-2xl border border-border bg-surface-1 py-3 pl-3 pr-4 hover:bg-surface-2"
        style={{ borderLeft: `3px solid ${ring}` }}
      >
        <span
          className="inline-flex shrink-0 rounded-xl"
          style={{ boxShadow: `0 0 0 1.5px ${ring}` }}
        >
          <Panel
            surface="event"
            name={name}
            artworkUrl={event.imageUrl ?? null}
            photoUrl={event.artistPhotoUrl ?? null}
            size={ROW_ART}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[17px] font-bold text-fg">{name}</span>
          <span
            className="truncate text-[12.5px] text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {formatEventLine(event)}
          </span>
          <GenreChips genres={event.genre ?? null} maxChips={1} />
        </span>
        <span
          className="shrink-0 text-[14px] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatPrice(event.ticketPriceMin)}
        </span>
      </Link>
    </li>
  );
};

export const CachedShortcuts = ({ events, venues }: CachedShortcutsProps) => {
  const eventItems = events.slice(0, MAX_EVENTS);
  const venueItems = venues.slice(0, MAX_VENUES);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          className={SECTION_LABEL_CLASS}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {OFFLINE_COPY.fallback.shortcutsLabel}
        </h2>
        <span
          className="rounded-md border border-warning px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-warning"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {OFFLINE_COPY.fallback.cachedBadge}
        </span>
      </div>
      {eventItems.length > 0 && (
        <ul className="flex flex-col gap-3">
          {eventItems.map((event) => (
            <CachedEventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
      {venueItems.length > 0 && (
        <>
          {eventItems.length > 0 && (
            <h2
              className={SECTION_LABEL_CLASS}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {OFFLINE_COPY.fallback.venuesLabel}
            </h2>
          )}
          <ul className="flex flex-col gap-2">
            {venueItems.map((venue) => (
              <li key={venue.id}>
                <Link
                  href={`/venues/${venue.slug}`}
                  className="flex min-h-[44px] items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3 hover:bg-surface-2"
                >
                  <span className="text-sm font-semibold text-fg">
                    {venue.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-fg-subtle">{OFFLINE_COPY.fallback.authNote}</p>
    </section>
  );
};

const TRY_AGAIN_CLASS =
  'inline-flex min-h-[44px] items-center justify-center rounded-full px-8 py-3 text-[17px] font-bold text-fg-on-accent';
export const TRY_AGAIN_STYLE = {
  background: 'linear-gradient(135deg, var(--signal), var(--accent))',
  boxShadow: '0 8px 28px color-mix(in oklch, var(--signal) 22%, transparent)',
} as const;
export { TRY_AGAIN_CLASS };

/** Nothing cached yet (B+ `bp-s-offline_empty_m`): the retry and a way home. */
export const CachedEmpty = ({ onRetry }: { onRetry: () => void }) => (
  <section className="flex flex-col items-center gap-3 text-center">
    <h1 className="text-[34px] font-black leading-[1.05] tracking-[-0.035em] text-fg">
      {OFFLINE_COPY.fallback.empty.title}
    </h1>
    <p className="max-w-[320px] text-[15px] leading-relaxed text-fg-muted">
      {OFFLINE_COPY.fallback.empty.sub}
    </p>
    <button
      type="button"
      onClick={onRetry}
      className={`${TRY_AGAIN_CLASS} mt-3`}
      style={TRY_AGAIN_STYLE}
    >
      {OFFLINE_COPY.fallback.retry}
    </button>
    <Link
      href="/"
      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border-strong px-6 py-2.5 text-[15px] font-semibold text-fg-muted"
    >
      {OFFLINE_COPY.fallback.empty.link}
    </Link>
  </section>
);
