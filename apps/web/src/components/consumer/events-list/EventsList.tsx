'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  parseListParam,
  type EventWithVenue,
  type EventsListResponse,
} from '@concert-crawl/types';
import { useEvents } from '@/lib/queries/use-events';
import { useWatching } from '@/lib/queries/use-watching';
import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row';
import { dateGroupLabel, isToday } from '@/components/consumer/definitions/lib';
import { localDateString } from '@/lib/time';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { DayHeader } from './DayHeader';

const copy = CONSUMER_COPY;

const PAGE_LIMIT = 20;

export interface EventsListProps {
  initialEvents: EventWithVenue[];
  initialOffset: number;
  total: number;
  limit: number;
  initialWatchedIds: string[];
}

export const EventsList = ({
  initialEvents,
  initialOffset,
  total,
  limit,
  initialWatchedIds,
}: EventsListProps) => {
  const searchParams = useSearchParams();
  // Read here rather than passed down from the server page: the list refetches
  // on a client-side filter change, so a server-rendered prop would name the
  // previous filter while the rows below it answer the current one.
  // Every chosen vibe (a repeated key), by the list rule the request uses.
  const filterVibes = parseListParam(searchParams.getAll('filterVibe'));

  // Build a stable query key from URL params (strip offset — managed by pagination)
  const searchParamsString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('offset');
    params.delete('page');
    return params.toString();
  }, [searchParams]);

  // Seed the cache with the SSR-provided first page
  const initialData: EventsListResponse = useMemo(
    () => ({ data: initialEvents, total, limit, offset: initialOffset }),
    [initialEvents, total, limit, initialOffset],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents({
    searchParamsString,
    limit: limit || PAGE_LIMIT,
    initialData,
    initialOffset,
  });

  const { data: watchedShows } = useWatching();
  const watchedIds = useMemo(
    () => new Set((watchedShows ?? []).map((show) => show.eventId)),
    [watchedShows],
  );

  // Flatten pages into a single event list
  const events = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.data),
    [data],
  );

  // The earliest day Browse may show: Denver's today, unless the URL asked for
  // an earlier start on purpose. The service worker answers /v1/events from its
  // cache when offline or stalled, and that copy may be from an earlier day:
  // its first rows would otherwise sit above "Tonight". A `filterWhen` chip
  // outranks `from` (see buildEventsApiParams), so `from` is ignored beside one.
  const startParam = searchParams.get('filterWhen')
    ? null
    : searchParams.get('from');
  const today = localDateString('America/Denver');
  const firstDay = startParam && startParam < today ? startParam : today;

  // Group events by date for display
  const groups = useMemo(() => {
    const grouped = new Map<string, EventWithVenue[]>();
    for (const event of events) {
      if (event.date < firstDay) continue;
      const key = event.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(event);
    }
    return grouped;
  }, [events, firstDay]);

  // Fall back to initialWatchedIds while the watching cache loads
  const effectiveWatchedIds =
    watchedShows !== undefined ? watchedIds : new Set(initialWatchedIds);

  return (
    <>
      {groups.size > 0 && (
        <div className="flex flex-col gap-6">
          {Array.from(groups.entries()).map(([date, dateEvents]) => {
            const label = dateGroupLabel(date);
            return (
              <section key={date} aria-label={label}>
                <DayHeader
                  date={date}
                  label={label}
                  count={dateEvents.length}
                  today={isToday(date)}
                />
                {/* B+ cards the rows, so a gap replaces the dividers. */}
                <div className="flex flex-col gap-2.5">
                  {dateEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      show={fromEventWithVenue(event, {
                        isWatching: effectiveWatchedIds.has(event.id),
                      })}
                      surface="browse"
                      filterVibes={filterVibes}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* B+ rule 10: the pink wave is reserved for waiting on shows at
          first load, so Load more stays quiet. While it fetches, the button
          holds its place and reads "Loading shows" instead of growing
          skeleton rows under the list. */}
      {(hasNextPage || isFetchingNextPage) && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              if (!isFetchingNextPage) void fetchNextPage();
            }}
            // aria-disabled rather than disabled, so a keyboard user's focus
            // stays on the button while the next page loads.
            aria-disabled={isFetchingNextPage || undefined}
            aria-busy={isFetchingNextPage || undefined}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border-strong bg-surface-2 px-4 text-[15px] font-bold text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1 aria-disabled:cursor-default aria-disabled:text-fg-subtle"
          >
            {isFetchingNextPage ? copy.loadingShows : copy.loadMore}
          </button>
        </div>
      )}
    </>
  );
};
