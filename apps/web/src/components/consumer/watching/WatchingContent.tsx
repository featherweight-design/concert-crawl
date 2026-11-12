'use client';

import { useState, useCallback, useRef } from 'react';
import type { WatchingShow } from '@concert-crawl/types';
import { useWatching } from '@/lib/queries/use-watching';
import { useWatchToggle } from '@/lib/queries/use-watch-toggle';
import { WatchingRow } from './WatchingRow';
import { WatchingEmpty } from './WatchingEmpty';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { MyShowsTabs } from '@/components/consumer/history/MyShowsTabs';
import {
  MY_SHOWS_GRADIENT,
  MY_SHOWS_HEADER_RULE_STYLE,
} from '@/components/consumer/history/definitions/constants';
import { denverTodayUtcMs } from '@/lib/time';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { useWatchingDismiss } from '@/lib/queries/use-watching-dismiss';
import { showUndoToast } from '@/components/consumer/going/lib/attendance-toasts';

const COPY = CONSUMER_COPY.watching;

// One dismiss toast at a time: a new one replaces the last rather than
// stacking (addendum 3, ruling 7).
const DISMISS_TOAST_ID = 'watching-dismiss';

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  // Shows whose dismiss POST is in flight. They stay out of the list until it
  // settles, so a refetch that lands mid-flight can't bring the row back, and
  // the ref turns away a second tap before React has re-rendered.
  const [pendingDismissIds, setPendingDismissIds] = useState<Set<string>>(
    new Set(),
  );
  const pendingDismissRef = useRef<Set<string>>(new Set());
  const displayedShows = shows.filter(
    (sv) =>
      !pendingRemoveIds.has(sv.eventId) && !pendingDismissIds.has(sv.eventId),
  );

  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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

  // The No longer listed dismiss. The row leaves the list at once
  // (useWatchingDismiss), the Undo toast waits for the server's yes, and any
  // failure puts the row back. Each call is awaited on its own, so two quick
  // dismisses each get their toast.
  const dismiss = useWatchingDismiss();

  // The tapped × is about to unmount with its row, so focus goes to the next
  // row's first control, or to the list heading when it was the last row, or
  // to the page when the list is about to be empty.
  const moveFocusFrom = useCallback(
    (eventId: string) => {
      const at = displayedShows.findIndex((sv) => sv.eventId === eventId);
      const next = at >= 0 ? displayedShows[at + 1] : undefined;
      const nextControl = next
        ? mainRef.current
            ?.querySelector(`[data-watching-event="${next.eventId}"]`)
            ?.querySelector<HTMLElement>(FOCUSABLE)
        : null;
      if (nextControl) {
        nextControl.focus();
      } else if (displayedShows.length > 1 && headerRef.current) {
        headerRef.current.focus();
      } else {
        mainRef.current?.focus();
      }
    },
    [displayedShows],
  );

  const restore = useCallback(
    async (show: WatchingShow) => {
      try {
        await dismiss({ show, dismissed: false });
      } catch {
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
    async (show: WatchingShow) => {
      if (pendingDismissRef.current.has(show.eventId)) return;
      pendingDismissRef.current.add(show.eventId);
      moveFocusFrom(show.eventId);
      setPendingDismissIds((prev) => new Set([...prev, show.eventId]));
      try {
        await dismiss({ show, dismissed: true });
        showUndoToast({
          id: DISMISS_TOAST_ID,
          message: COPY.dismiss.hidden(show.artist),
          undoLabel: COPY.dismiss.undo,
          onUndo: () => void restore(show),
        });
      } catch (err) {
        const stillListed =
          err instanceof ApiError &&
          err.status === 409 &&
          err.code === 'not_delisted';
        toast.error(
          stillListed ? COPY.dismiss.stillListed : COPY.dismiss.failed,
          { id: DISMISS_TOAST_ID },
        );
      } finally {
        pendingDismissRef.current.delete(show.eventId);
        setPendingDismissIds((prev) => {
          const next = new Set(prev);
          next.delete(show.eventId);
          return next;
        });
      }
    },
    [dismiss, restore, moveFocusFrom],
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
      className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 outline-none sm:px-8 sm:pb-10 sm:pt-8"
    >
      <MyShowsTabs active="watching" />

      {/* Headline block. An empty list skips it: the empty card's own eyebrow
          and headline say it (B+ `bp-s-empty_watching_m`). */}
      {displayedShows.length > 0 && (
        <div
          ref={headerRef}
          tabIndex={-1}
          data-testid="watching-header"
          className="mb-5 border-b border-transparent pb-4 outline-none sm:mb-6 sm:pb-5"
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
                      onDismiss={(dismissed) => void handleDismiss(dismissed)}
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
