'use client';

// The /history route body (#70) — the three-state switch from
// design_handoff_concert_history/history-routes.jsx:242-298.
//
// Mobile and desktop are ONE component. The handoff draws <HistoryRoute> and
// <HistoryRouteDesktop> separately for canvas storyboarding; the real difference
// is a two-column grid with a sticky rail at lg, which is a media query, not a
// second tree (READINESS open observation 2).
//
// The handoff's themeKey and density designer knobs are not props: theme comes
// from the shipped theme context, and density is fixed at cozy to match Watching.
//
// #1357 added the Upcoming half. A show you tapped "I'm going!" on used to have
// nowhere to sit until its date passed. Upcoming and Past are the same rows
// split by date, so they share HistoryItem and the month grouper untouched —
// only the reading direction differs, and the API returns each half already
// ordered. The header, the export and the passport stay past-only: nights,
// venues and spend are all past-tense claims.

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { HistoryResponse, HistoryShow } from '@concert-crawl/types';
import type { VenueStampVariant } from '@/components/consumer/venue-stamp';
import { RemoveConfirm } from '@/components/consumer/going/RemoveConfirm';
import {
  showAttendanceError,
  showRemovedToast,
} from '@/components/consumer/going/lib/attendance-toasts';
import { ShareSheet } from '@/components/consumer/share/ShareSheet';
import { toPosterEvent } from '@/lib/share/poster-event';
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle';
import { useEntitlement } from '@/lib/queries/use-entitlement';
import { useHistory } from '@/lib/queries/use-history';
import { MyShowsTabs } from './MyShowsTabs';
import { HistoryHeader } from './HistoryHeader';
import { HistoryItem } from './HistoryItem';
import { HistoryEmpty } from './HistoryEmpty';
import { HistoryLocked } from './HistoryLocked';
import { SaveCalendarRow } from './SaveCalendarRow';
import { PassportTeaser } from './PassportTeaser';
import { groupHistoryByMonth } from './lib/buckets';
import { HISTORY_DENSITY } from './definitions/constants';
import { HISTORY_COPY } from './definitions/copy';

const SECTION_COPY = HISTORY_COPY.sections;

interface HistoryContentProps {
  // null when the server's fetch came back 403 — see `locked`.
  initialData: HistoryResponse | null;
  // The server's belt-and-braces verdict from the /v1/history 403.
  locked: boolean;
  scaRegion: boolean;
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8 lg:max-w-[960px]">
    {children}
  </main>
);

type RowActions = { onRemove: () => void; onShare: () => void };

const MonthBuckets = ({
  shows,
  stamp,
  restoredId,
  actionsFor,
}: {
  shows: HistoryShow[];
  stamp: VenueStampVariant;
  restoredId: string | null;
  /** The ⋯ for a row. Omitted for a half that has no row actions. */
  actionsFor?: ((show: HistoryShow) => RowActions) | undefined;
}) => (
  <>
    {groupHistoryByMonth(shows).map((bucket) => (
      <section key={bucket.key}>
        <div className="flex items-baseline gap-2 px-1 pb-1 pt-2.5">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--fg-subtle)',
            }}
          >
            {bucket.label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--fg-subtle)',
            }}
          >
            {`· ${bucket.shows.length}`}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {bucket.shows.map((show) => (
            <HistoryItem
              key={show.eventId}
              show={show}
              density={HISTORY_DENSITY}
              stamp={stamp}
              restored={show.eventId === restoredId}
              menu={actionsFor?.(show)}
            />
          ))}
        </div>
      </section>
    ))}
  </>
);

// One half of the attendance list. The empty line is inline rather than a full
// EmptyState: the other half has rows, so this is a gap in a populated screen,
// not an empty screen.
const AttendanceSection = ({
  heading,
  emptyLabel,
  shows,
  stamp,
  restoredId,
  actionsFor,
}: {
  heading: string;
  emptyLabel: string;
  shows: HistoryShow[];
  /** Upcoming nights show the dashed stamp they will become (B+ rule 4). */
  stamp: VenueStampVariant;
  restoredId: string | null;
  actionsFor?: ((show: HistoryShow) => RowActions) | undefined;
}) => (
  <section aria-label={heading} className="flex flex-col gap-2 sm:gap-3">
    <h2
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: 'var(--fg)',
      }}
    >
      {heading}
    </h2>
    {shows.length === 0 ? (
      <p
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          color: 'var(--fg-muted)',
        }}
      >
        {emptyLabel}
      </p>
    ) : (
      <MonthBuckets
        shows={shows}
        stamp={stamp}
        restoredId={restoredId}
        actionsFor={actionsFor}
      />
    )}
  </section>
);

export const HistoryContent = ({
  initialData,
  locked,
  scaRegion,
}: HistoryContentProps) => {
  const { isLoading, active } = useEntitlement('concert-history');
  // Only poll the API when the client agrees the plan can read history —
  // otherwise the query just re-earns the 403 the server already reported.
  const clientEntitled = !isLoading && active;
  const { data } = useHistory({
    initialData,
    enabled: !locked && clientEntitled,
  });
  const history = data ?? initialData;

  const { user } = useUser();
  const toggle = useAttendingToggle();
  // The past-night confirm. It stays open while the remove is in flight and
  // shows the failure in place, and closes only once the server has said yes
  // (addendum 3: remove-busy-m, remove-failed-m).
  const [removing, setRemoving] = useState<{
    show: HistoryShow;
    status: 'idle' | 'pending' | 'failed';
  } | null>(null);
  const [sharing, setSharing] = useState<HistoryShow | null>(null);
  // The night an Undo just put back, so its row fades in rather than popping.
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // Takes the night out and raises the toast. Both halves end here, with and
  // without a confirm: a past night asks first, an upcoming one does not.
  const release = (show: HistoryShow, onDone: (ok: boolean) => void) => {
    toggle.mutate(
      { eventId: show.eventId, going: false },
      {
        onSuccess: (result) => {
          const restore = result.restore ?? null;
          showRemovedToast({
            artist: show.artist,
            onUndo: restore
              ? () => {
                  setRestoredId(show.eventId);
                  toggle.mutate(
                    { eventId: show.eventId, going: true, restore },
                    { onError: () => showAttendanceError('undo') },
                  );
                }
              : null,
          });
          onDone(true);
        },
        onError: () => onDone(false),
      },
    );
  };

  const confirmRemove = (show: HistoryShow) => {
    setRemoving({ show, status: 'pending' });
    release(show, (ok) => setRemoving(ok ? null : { show, status: 'failed' }));
  };

  const actionsFor =
    (tense: 'past' | 'upcoming') =>
    (show: HistoryShow): RowActions => ({
      onRemove:
        tense === 'past'
          ? () => setRemoving({ show, status: 'idle' })
          : () =>
              release(show, (ok) => {
                if (!ok) showAttendanceError('save');
              }),
      onShare: () => setSharing(show),
    });

  // Server 403 wins outright; the client hook is what decides for a plan the
  // server hasn't rejected (e.g. a stale token that downgraded mid-session).
  const isLocked = locked || (!isLoading && !active);

  if (isLocked) {
    return (
      <Shell>
        <MyShowsTabs active="history" />
        <HistoryLocked scaRegion={scaRegion} />
      </Shell>
    );
  }

  // Hold the layout while the plan resolves rather than flashing empty at a
  // Supporter whose rows are already in `initialData`.
  if (history === null) {
    return (
      <Shell>
        <MyShowsTabs active="history" />
      </Shell>
    );
  }

  if (history.past.length === 0 && history.upcoming.length === 0) {
    return (
      <Shell>
        <MyShowsTabs active="history" />
        <HistoryEmpty />
      </Shell>
    );
  }

  return (
    <Shell>
      <MyShowsTabs active="history" />
      <HistoryHeader stats={history.stats} />

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        {/* First in the DOM so the export and the passport sit above the list on
            mobile, where the tail of a long history buried them. The explicit
            grid placement puts the rail back in the right-hand column at lg. */}
        <aside
          data-testid="history-rail"
          className="mb-4 flex flex-col gap-3.5 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:mb-0"
        >
          <SaveCalendarRow count={history.past.length} />
          <PassportTeaser stats={history.stats} shows={history.past} />
        </aside>

        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <AttendanceSection
            heading={SECTION_COPY.upcoming}
            emptyLabel={SECTION_COPY.upcomingEmpty}
            shows={history.upcoming}
            stamp="dashed"
            restoredId={restoredId}
            actionsFor={actionsFor('upcoming')}
          />
          <AttendanceSection
            heading={SECTION_COPY.past}
            emptyLabel={SECTION_COPY.pastEmpty}
            shows={history.past}
            stamp="solid"
            restoredId={restoredId}
            actionsFor={actionsFor('past')}
          />
        </div>
      </div>

      {removing && (
        <RemoveConfirm
          open
          onClose={() => setRemoving(null)}
          show={removing.show}
          footnote="concerts"
          onConfirm={() => confirmRemove(removing.show)}
          pending={removing.status === 'pending'}
          failed={removing.status === 'failed'}
        />
      )}
      {sharing && (
        <ShareSheet
          open
          onClose={() => setSharing(null)}
          event={toPosterEvent({
            id: sharing.eventId,
            artist: sharing.artist,
            date: sharing.date,
            showTime: sharing.rawShowTime,
            venue: {
              name: sharing.venueName,
              city: sharing.venueCity,
              timezone: sharing.venueTimezone,
            },
          })}
          handle={user?.username ?? null}
        />
      )}
    </Shell>
  );
};
