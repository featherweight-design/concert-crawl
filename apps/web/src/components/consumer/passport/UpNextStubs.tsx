import Link from 'next/link';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { Panel } from '@/components/consumer/image-slot';
import { genreRing } from '@/components/consumer/event-row/lib/genre-ring';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { daysUntil } from '@/lib/passport/booklet';
import { stampDateParts } from '@/lib/passport/stamp';

const COPY = CONSUMER_COPY.passport;

/** Stubs drawn before the rest fold into a `+ N more` link. */
export const UP_NEXT_STUBS = 2;

const MONO_LABEL =
  'font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle';

// The torn-off end of the stub, as `addendum-2/04/passport-m` draws it, in px.
export const STUB_WIDTH = 80;
export const GHOST_SIZE = 56;
export const GHOST_TILE_SIZE = 18;
export const GHOST_TILE_OPACITY = 0.45;
const NOTCH_SIZE = 16;

/** A notch punched out of the stub's edge, on the perforation, in the page colour. */
function Notch({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <span
      aria-hidden="true"
      className="absolute translate-x-1/2 rounded-full border border-border bg-bg"
      style={{
        right: STUB_WIDTH,
        width: NOTCH_SIZE,
        height: NOTCH_SIZE,
        ...(edge === 'top' ? { top: -8 } : { bottom: -8 }),
      }}
    />
  );
}

function UpNextStub({
  show,
  today,
  first,
}: {
  show: HistoryShow;
  today: string;
  first: boolean;
}) {
  const days = COPY.inDays(daysUntil(show.date, today));
  const date = stampDateParts(show.date);
  const genre = genreColor(show.genre) ?? NEUTRAL_GENRE_COLOR;
  return (
    <Link
      href={`/events/${show.eventId}`}
      data-up-next-stub={show.eventId}
      className="relative flex min-h-[92px] items-stretch rounded-2xl border border-border bg-surface-1 text-fg no-underline"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3.5 py-3 pl-3.5 pr-3">
        {/* The genre image ring, as every row that frames its artwork. */}
        <span
          data-testid="up-next-art"
          className="block shrink-0 overflow-hidden rounded-md"
          style={{ boxShadow: genreRing(genre) }}
        >
          <Panel
            surface="artist"
            name={show.artist}
            photoUrl={show.artistPhotoUrl}
            size={first ? 54 : 44}
          />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-signal">
            {first ? `${COPY.nextStamp} · ${days}` : days}
          </span>
          <span className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.02em]">
            {show.artist}
          </span>
          <span className="truncate font-mono text-[11px] text-fg-muted">
            {`${show.venueName} · ${show.dateLabel}`}
          </span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center border-dashed border-border-strong"
        style={{ width: STUB_WIDTH, borderLeftWidth: 1.5 }}
      >
        {/* The ghost of the stamp to come (`passport-m`): a grey dashed ring
            holding the greyed venue tile, with the date inside the ring. */}
        <span
          data-up-next-ghost=""
          className="flex flex-col items-center justify-center rounded-full border-dashed border-border-strong"
          style={{
            width: GHOST_SIZE,
            height: GHOST_SIZE,
            borderWidth: 1.5,
            gap: 6,
          }}
        >
          <span
            data-up-next-ghost-tile=""
            style={{
              display: 'flex',
              filter: 'grayscale(1)',
              opacity: GHOST_TILE_OPACITY,
            }}
          >
            <VenueTile
              slug={show.venueSlug}
              name={show.venueName}
              size={GHOST_TILE_SIZE}
            />
          </span>
          {date !== null && (
            <span
              data-up-next-ghost-date=""
              className="font-mono font-semibold text-fg-subtle"
              style={{
                fontSize: 8.5,
                letterSpacing: '0.14em',
              }}
            >
              {`${date.month} ${date.day}`}
            </span>
          )}
        </span>
      </span>
      <Notch edge="top" />
      <Notch edge="bottom" />
    </Link>
  );
}

interface UpNextStubsProps {
  /** Shows still ahead, soonest first. */
  queue: HistoryShow[];
  /** Today in Denver, `YYYY-MM-DD`. */
  today: string;
}

/**
 * Up next as a ticket stub (B+ rule 1): the show, a perforation, and the
 * ghost of the stamp it will become torn off at the right.
 */
export function UpNextStubs({ queue, today }: UpNextStubsProps) {
  if (queue.length === 0) return null;
  const drawn = queue.slice(0, UP_NEXT_STUBS);
  const more = queue.length - drawn.length;
  return (
    <section aria-label={COPY.upNext} className="flex flex-col gap-2.5">
      <h2 className={MONO_LABEL}>{COPY.upNext}</h2>
      {drawn.map((show, index) => (
        <UpNextStub
          key={show.eventId}
          show={show}
          today={today}
          first={index === 0}
        />
      ))}
      {more > 0 && (
        <Link
          href="/history"
          className="text-sm font-bold text-signal no-underline"
        >
          {COPY.moreGoing(more)} →
        </Link>
      )}
    </section>
  );
}
