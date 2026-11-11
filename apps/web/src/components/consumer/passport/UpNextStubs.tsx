import Link from 'next/link';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { Panel } from '@/components/consumer/image-slot';
import { VenueStamp } from '@/components/consumer/venue-stamp';
import { daysUntil } from '@/lib/passport/booklet';
import { stampDateParts } from '@/lib/passport/stamp';

const COPY = CONSUMER_COPY.passport;

/** Stubs drawn before the rest fold into a `+ N more` link. */
export const UP_NEXT_STUBS = 2;

const MONO_LABEL =
  'font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle';

/** A notch punched out of the stub's edge, in the page colour. */
function Notch({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <span
      aria-hidden="true"
      className="absolute right-[88px] size-3.5 translate-x-1/2 rounded-full border border-border bg-bg"
      style={edge === 'top' ? { top: -8 } : { bottom: -8 }}
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
  return (
    <Link
      href={`/events/${show.eventId}`}
      data-up-next-stub={show.eventId}
      className="relative flex min-h-[92px] items-stretch rounded-2xl border border-border bg-surface-1 text-fg no-underline"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3.5 py-3 pl-3.5 pr-3">
        <Panel
          surface="artist"
          name={show.artist}
          photoUrl={show.artistPhotoUrl}
          size={first ? 54 : 44}
        />
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
        className="flex w-[88px] shrink-0 flex-col items-center justify-center gap-1.5 border-l border-dashed border-border-strong"
      >
        <VenueStamp
          venueSlug={show.venueSlug}
          venueName={show.venueName}
          seed={show.artist}
          variant="dashed"
          size={first ? 44 : 38}
        />
        {date !== null && (
          <span className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle">
            {`${date.month} ${date.day}`}
          </span>
        )}
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
 * dashed stamp it will become torn off at the right.
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
