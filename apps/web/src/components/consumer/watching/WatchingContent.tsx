'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { WatchingShow } from '@concert-crawl/types';
import { useWatching } from '@/lib/queries/use-watching';
import { useWatchToggle } from '@/lib/queries/use-watch-toggle';
import { WatchingRow } from './WatchingRow';
import { WatchingEmpty } from './WatchingEmpty';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  MY_SHOWS_GRADIENT,
  MY_SHOWS_HEADER_RULE_STYLE,
} from '@/components/consumer/history/definitions/constants';
import { denverTodayUtcMs } from '@/lib/time';
import { toast } from 'sonner';
import {
  isStillListed,
  useWatchingDismiss,
} from '@/lib/queries/use-watching-dismiss';
import { showUndoToast } from '@/components/consumer/going/lib/attendance-toasts';
import { FOCUSABLE } from '@/lib/hooks/useFocusTrap';

const COPY = CONSUMER_COPY.watching;

// One dismiss toast at a time: a new one replaces the last rather than
// stacking (addendum 3, ruling 7).
const DISMISS_TOAST_ID = 'watching-dismiss';

interface WatchingContentProps {
  initialShows: WatchingShow[];
}

export function countChanges(shows: WatchingShow[]): {
  drops: number;
  spikes: number;
  soldOut: number;
} {
  let drops = 0;
  let spikes = 0;
  let soldOut = 0;
  for (const show of shows) {
    // A cancelled or postponed show's row says that, not "Sold out" or a
    // price move (resolveRowStatus), so the summary leaves it out entirely.
    if (show.eventStatus !== 'upcoming') continue;
    if (show.watchStatus === 'soldout') {
      soldOut++;
    } else if (
      show.savedPrice !== null &&
      show.currentPrice !== null &&
      show.currentPrice - show.savedPrice <= -2
    ) {
      drops++;
    } else if (
      show.savedPrice !== null &&
      show.currentPrice !== null &&
      show.currentPrice - show.savedPrice >= 2
    ) {
      spikes++;
    }
  }
  return { drops, spikes, soldOut };
}

type DateBucket =
  'tonight' | 'thisWeek' | 'nextWeek' | { month: string; year: number };

// Show dates are Denver calendar dates, so "tonight" is Denver's today
// whatever the viewer's own clock says. Both sides sit at UTC midnight, so
// the arithmetic never meets a DST or local-zone offset.
export function classifyDate(dateStr: string): DateBucket {
  const showMs = Date.parse(`${dateStr}T00:00:00Z`);
  const daysUntil = Math.round((showMs - denverTodayUtcMs()) / 86400000);
  if (daysUntil === 0) return 'tonight';
  if (daysUntil < 7) return 'thisWeek';
  if (daysUntil < 14) return 'nextWeek';
  const date = new Date(showMs);
  return {
    month: date.toLocaleDateString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    }),
    year: date.getUTCFullYear(),
  };
}

function bucketKey(bucket: DateBucket): string {
  if (bucket === 'tonight') return 'tonight';
  if (bucket === 'thisWeek') return 'thisWeek';
  if (bucket === 'nextWeek') return 'nextWeek';
  return `${bucket.month}-${bucket.year}`;
}

function bucketLabel(bucket: DateBucket): string {
  if (bucket === 'tonight') return COPY.watchingContent.bucketTonight;
  if (bucket === 'thisWeek') return COPY.watchingContent.bucketThisWeek;
  if (bucket === 'nextWeek') return COPY.watchingContent.bucketNextWeek;
  return bucket.month;
}

interface GroupedShows {
  bucket: DateBucket;
  key: string;
  label: string;
  shows: WatchingShow[];
}

function groupShows(shows: WatchingShow[]): GroupedShows[] {
  const bucketMap = new Map<string, GroupedShows>();
  const bucketOrder: string[] = [];
  for (const show of shows) {
    const bucket = classifyDate(show.date);
    const key = bucketKey(bucket);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        bucket,
        key,
        label: bucketLabel(bucket),
        shows: [],
      });
      bucketOrder.push(key);
    }
    bucketMap.get(key)!.shows.push(show);
  }
  return bucketOrder.map((key) => bucketMap.get(key)!);
}

export function WatchingContent({ initialShows }: WatchingContentProps) {
  const { data: cachedShows } = useWatching({ initialData: initialShows });
  const toggle = useWatchToggle();
  const shows = cachedShows ?? initialShows;

  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<string>>(
    new Set(),
  );
  // The No longer listed dismiss. The row leaves the list at once
  // (useWatchingDismiss), the Undo toast waits for the server's yes, and any
  // failure puts the row back. Each call is awaited on its own, so two quick
  // dismisses each get their toast.
  const { dismiss, isHiding } = useWatchingDismiss();
  const displayedShows = shows.filter(
    (sv) => !pendingRemoveIds.has(sv.eventId) && !isHiding(sv.eventId),
  );
  // The callbacks below read the list through this ref, so they stay stable
  // across renders instead of rebuilding with every new array.
  const displayedRef = useRef(displayedShows);
  displayedRef.current = displayedShows;

  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  // A failed dismiss owes focus back to its row's ×, once that row is drawn
  // again. `from` is where the dismiss sent focus: it is only taken back from
  // there, never from somewhere the viewer has since moved it.
  const focusBackRef = useRef<{
    eventId: string;
    from: Element | null;
  } | null>(null);

  const takeFocusBack = useCallback(() => {
    const owed = focusBackRef.current;
    if (!owed) return;
    const active = document.activeElement;
    if (active !== owed.from && active !== document.body && active !== null) {
      focusBackRef.current = null;
      return;
    }
    const control = mainRef.current
      ?.querySelector(`[data-watching-event="${owed.eventId}"]`)
      ?.querySelector<HTMLElement>('[data-row-action]');
    if (!control) return;
    focusBackRef.current = null;
    control.focus();
  }, []);

  // The row comes back on a later render: a rollback, or the refetch after a
  // 409. Every commit checks whether the owed focus can be paid now.
  useEffect(() => {
    takeFocusBack();
  });

  const handleRemove = useCallback(
    (userEventId: string) => {
      const show = shows.find((sv) => sv.userEventId === userEventId);
      if (!show || pendingRemoveIds.has(show.eventId)) return;
      setPendingRemoveIds((prev) => new Set([...prev, show.eventId]));
      toggle.mutate(show.eventId, {
        onSettled: () => {
          setPendingRemoveIds((prev) => {
            const next = new Set(prev);
            next.delete(show.eventId);
            return next;
          });
        },
      });
    },
    [shows, toggle, pendingRemoveIds],
  );

  // The tapped × is about to unmount with its row, so focus goes to the next
  // row's first control, or to the list heading when it was the last row, or
  // to the page when the list is about to be empty. Returns where it went.
  const moveFocusFrom = useCallback((eventId: string): Element | null => {
    const rows = displayedRef.current;
    const at = rows.findIndex((sv) => sv.eventId === eventId);
    const next = at >= 0 ? rows[at + 1] : undefined;
    const nextControl = next
      ? mainRef.current
          ?.querySelector(`[data-watching-event="${next.eventId}"]`)
          ?.querySelector<HTMLElement>(FOCUSABLE)
      : null;
    if (nextControl) {
      nextControl.focus();
    } else if (rows.length > 1 && headerRef.current) {
      headerRef.current.focus();
    } else {
      mainRef.current?.focus();
    }
    return document.activeElement;
  }, []);

  const restore = useCallback(
    async (show: WatchingShow) => {
      try {
        await dismiss({ show, dismissed: false });
      } catch (err) {
        console.warn('watching dismiss undo failed', err);
        // A failed Undo is the error toast (addendum 3, ruling 32), with one
        // more go at it, since the Undo toast it replaced is gone.
        toast.error(COPY.dismiss.undoFailed, {
          id: DISMISS_TOAST_ID,
          action: {
            label: COPY.dismiss.retry,
            onClick: () => void restore(show),
          },
        });
      }
    },
    [dismiss],
  );

  const handleDismiss = useCallback(
    (show: WatchingShow) => {
      // A second tap before React has re-rendered finds the POST already out.
      if (isHiding(show.eventId)) return;
      focusBackRef.current = null;
      const request = dismiss({ show, dismissed: true });
      const movedTo = moveFocusFrom(show.eventId);
      request.then(
        () =>
          showUndoToast({
            id: DISMISS_TOAST_ID,
            message: COPY.dismiss.hidden(show.artist),
            undoLabel: COPY.dismiss.undo,
            onUndo: () => void restore(show),
          }),
        (err: unknown) => {
          console.warn('watching dismiss failed', err);
          // The row is coming back: at once from the rollback, or with the
          // refetch after a 409. Its × gets focus back when it lands, and the
          // error toast (a live region) says why it is still there.
          focusBackRef.current = { eventId: show.eventId, from: movedTo };
          takeFocusBack();
          toast.error(
            isStillListed(err) ? COPY.dismiss.stillListed : COPY.dismiss.failed,
            { id: DISMISS_TOAST_ID },
          );
        },
      );
    },
    [dismiss, isHiding, restore, moveFocusFrom, takeFocusBack],
  );

  const { drops, spikes, soldOut } = countChanges(displayedShows);
  const groups = groupShows(displayedShows);

  const changeSummary = () => {
    const parts: string[] = [];
    if (drops > 0)
      parts.push(`${drops} ${COPY.watchingContent.priceSummaryDropped}`);
    if (spikes > 0)
      parts.push(`${spikes} ${COPY.watchingContent.priceSummaryUp}`);
    if (soldOut > 0)
      parts.push(`${soldOut} ${COPY.watchingContent.priceSummarySoldOut}`);
    if (parts.length === 0) return COPY.watchingContent.priceSummaryHeld;
    return parts.join(' · ');
  };

  return (
    <main
      ref={mainRef}
      tabIndex={-1}
      // The column and the sub-tab bar are the My shows layout's (MyShowsShell).
      className="w-full flex-1 outline-none"
    >
      {/* Headline block. An empty list skips it: the empty card's own eyebrow
          and headline say it (B+ `bp-s-empty_watching_m`). */}
      {displayedShows.length > 0 && (
        <div
          ref={headerRef}
          tabIndex={-1}
          data-testid="watching-header"
          // Focus lands here when a dismissed row was the last one, so a
          // keyboard user sees where it went.
          className="mb-5 rounded-sm border-b border-transparent pb-4 outline-none focus-visible:ring-2 focus-visible:ring-signal sm:mb-6 sm:pb-5"
          style={MY_SHOWS_HEADER_RULE_STYLE}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
              margin: '0 0 4px',
            }}
          >
            {COPY.watchingContent.eyebrow}
          </p>
          <div className="flex items-baseline gap-3">
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: '-0.025em',
                color: 'var(--fg)',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {/* B+: the count, alone on this header, takes the gradient. */}
              <span
                data-testid="watching-count"
                style={{
                  backgroundImage: MY_SHOWS_GRADIENT,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {displayedShows.length}
              </span>{' '}
              {displayedShows.length !== 1
                ? COPY.watchingContent.showsPlural
                : COPY.watchingContent.showsSingular}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 600,
                color: drops > 0 ? 'var(--success)' : 'var(--fg-muted)',
                margin: 0,
              }}
            >
              {changeSummary()}
            </p>
          </div>
        </div>
      )}

      {/* Show list */}
      {displayedShows.length === 0 ? (
        <WatchingEmpty />
      ) : (
        <div className="flex flex-col gap-2 sm:gap-3">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="flex items-baseline gap-2 px-1 pb-1 pt-2.5">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color:
                      group.key === 'tonight'
                        ? 'var(--accent)'
                        : 'var(--fg-subtle)',
                  }}
                >
                  {group.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 500,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  · {group.shows.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {group.shows.map((show) => (
                  // `contents` keeps the row a direct flex child; the wrapper
                  // only lets a dismiss find the next row to focus.
                  <div
                    key={show.userEventId}
                    className="contents"
                    data-watching-event={show.eventId}
                  >
                    <WatchingRow
                      show={show}
                      onRemove={handleRemove}
                      onDismiss={handleDismiss}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
