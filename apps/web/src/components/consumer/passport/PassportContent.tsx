'use client';

// The /passport route body (#85, booklet B+ B13).
//
// The Passport is drawn from Concert History, so it is gated on the same
// entitlement and locked by the same component — a second lock screen saying
// the same thing in different words is how two surfaces of one feature start
// quoting different prices.

import { useEffect, useState } from 'react';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { HistoryLocked } from '@/components/consumer/history/HistoryLocked';
import { PassportActions } from '@/components/consumer/passport/PassportActions';
import { PassportBooklet } from '@/components/consumer/passport/PassportBooklet';
import { PassportEmpty } from '@/components/consumer/passport/PassportEmpty';
import type { PassportIdentity } from '@/components/consumer/passport/PassportIdPage';
import { UpNextStubs } from '@/components/consumer/passport/UpNextStubs';
import { VenuesCollected } from '@/components/consumer/passport/VenuesCollected';
import {
  bookletPages,
  collectedVenues,
  upcomingQueue,
} from '@/lib/passport/booklet';
import { toAttendedShows } from '@/lib/passport/select-shows';
import { stampDateParts } from '@/lib/passport/stamp';
import { passportStats } from '@/lib/passport/stats';
import { useEntitlement } from '@/lib/queries/use-entitlement';
import { useTheme } from '@/theme';

const COPY = CONSUMER_COPY.passport;

export interface PassportContentProps {
  /** Attended shows whose night has passed: the stamps. */
  past: HistoryShow[];
  /** Attended shows still ahead: Up next and the next slot. */
  upcoming: HistoryShow[];
  /** Every active venue, for Venues collected. Empty if the list failed. */
  activeVenues: { slug: string; name: string }[];
  identity: PassportIdentity;
  /** Today in Denver, `YYYY-MM-DD`. */
  today: string;
  /** The server's verdict from the /v1/history 403. */
  locked: boolean;
  scaRegion: boolean;
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-20 pt-4 sm:px-8 lg:pb-10 sm:pt-8">
    {children}
  </main>
);

/** `Your Passport`, with the last word in the brand gradient. */
function PageTitle() {
  const split = COPY.pageTitle.lastIndexOf(' ');
  const lead = COPY.pageTitle.slice(0, split + 1);
  const mark = COPY.pageTitle.slice(split + 1);
  return (
    <h1 className="text-[34px] font-black leading-none tracking-[-0.04em] text-fg sm:text-[44px]">
      {lead}
      <span
        style={{
          background: 'linear-gradient(90deg, var(--signal), var(--accent))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {mark}
      </span>
    </h1>
  );
}

export const PassportContent = ({
  past,
  upcoming,
  activeVenues,
  identity,
  today,
  locked,
  scaRegion,
}: PassportContentProps) => {
  const { isLoading, active } = useEntitlement('concert-history');
  const { theme } = useTheme();

  // The share card is drawn in the theme the reader can see, which the browser
  // knows and the server does not. Held until mount so the prefetch runs once,
  // against the live theme: rendering it earlier would fetch the card, then
  // fetch it again the moment the theme resolved, and drop the button back to
  // "Preparing…" in between.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const imageUrl = `/passport/square?theme=${encodeURIComponent(theme)}`;

  // Server 403 wins outright; the client hook decides for a plan the server
  // hasn't rejected — e.g. a token that downgraded mid-session.
  if (locked || (!isLoading && !active)) {
    return (
      <Shell>
        <HistoryLocked scaRegion={scaRegion} />
      </Shell>
    );
  }

  const queue = upcomingQueue(upcoming, today);
  const upNext = <UpNextStubs queue={queue} today={today} />;

  if (past.length === 0) {
    // Addendum 2 item 16. A phone keeps the approved empty card; from `sm` up
    // it is the open, empty book (`passport-empty-d`): the ID page at
    // 0 / 0 / —, four empty round slots, the empty block beside it and every
    // venue greyed. Share and Save image wait for the first stamp.
    const emptyStats = passportStats([]);
    const emptyPages = bookletPages([], queue[0] ?? null);
    const emptyVenues = collectedVenues(activeVenues, []);
    // Upcoming shows and no stamps (addendum 4 item 8): the open booklet at
    // both widths, its first page holding the dashed NEXT stamp, with a
    // subtitle that names the date. With nothing ahead either, a phone keeps
    // the approved empty card.
    const next = queue[0] ?? null;
    const nextParts = next === null ? null : stampDateParts(next.date);
    const subtitle =
      nextParts === null
        ? COPY.pageSubtitle
        : COPY.firstStampSubtitle(
            `${nextParts.month.charAt(0)}${nextParts.month.slice(1).toLowerCase()} ${nextParts.day}`,
          );
    const openBook = next !== null;
    return (
      <Shell>
        {!openBook && (
          <div data-passport-empty-layout="phone" className="sm:hidden">
            <header className="mb-6">
              <PageTitle />
            </header>
            <div className="flex flex-col gap-8">
              <PassportEmpty />
              <div className="mx-auto w-full max-w-[460px]">{upNext}</div>
            </div>
          </div>
        )}
        <div
          data-passport-empty-layout="desktop"
          className={`${openBook ? 'grid' : 'hidden sm:grid'} grid-cols-[minmax(0,1fr)] gap-x-[30px] gap-y-6 [grid-template-areas:'head'_'book'_'side'] lg:grid-cols-[minmax(0,580px)_minmax(0,1fr)] lg:[grid-template-areas:'head_head'_'book_side']`}
        >
          <header className="flex flex-col gap-2 [grid-area:head]">
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle ${openBook ? 'hidden sm:block' : ''}`}
            >
              {COPY.breadcrumb}
            </p>
            <PageTitle />
            <p className="text-sm text-fg-muted sm:text-[15px]">{subtitle}</p>
          </header>
          <div className="min-w-0 [grid-area:book]">
            <PassportBooklet
              pages={emptyPages}
              identity={identity}
              stats={emptyStats}
              pager={false}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-7 [grid-area:side]">
            {/* With a show ahead the open book and Up next say it all; the
                "No stamps yet" block is for a reader with nothing ahead. */}
            {!openBook && <PassportEmpty variant="block" />}
            {upNext}
            <VenuesCollected
              venues={emptyVenues.venues}
              collected={emptyVenues.collected}
              total={emptyVenues.total}
            />
          </div>
        </div>
      </Shell>
    );
  }

  const stats = passportStats(toAttendedShows(past));
  const pages = bookletPages(past, queue[0] ?? null);
  const venues = collectedVenues(activeVenues, past);

  return (
    <Shell>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-[30px] gap-y-6 [grid-template-areas:'head'_'book'_'actions'_'side'] lg:grid-cols-[minmax(0,580px)_minmax(0,1fr)] lg:[grid-template-areas:'head_actions'_'book_side']">
        <header className="flex flex-col gap-2 [grid-area:head]">
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle sm:block">
            {COPY.breadcrumb}
          </p>
          <PageTitle />
          <p className="text-sm text-fg-muted sm:text-[15px]">
            {COPY.pageSubtitle}
          </p>
        </header>

        <div
          className="min-w-0 [grid-area:book]"
          data-testid="passport-booklet"
        >
          <PassportBooklet pages={pages} identity={identity} stats={stats} />
        </div>

        <div className="[grid-area:actions] lg:self-end">
          {mounted && <PassportActions imageUrl={imageUrl} />}
        </div>

        <div className="flex flex-col gap-7 [grid-area:side]">
          {upNext}
          <VenuesCollected
            venues={venues.venues}
            collected={venues.collected}
            total={venues.total}
          />
        </div>
      </div>
    </Shell>
  );
};
