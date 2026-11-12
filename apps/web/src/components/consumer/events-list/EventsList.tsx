'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types';
import { useEvents } from '@/lib/queries/use-events';
import { useWatching } from '@/lib/queries/use-watching';
import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row';
import { dateGroupLabel, isToday } from '@/components/consumer/definitions/lib';
import { localDateString } from '@/lib/time';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { DayTile } from './DayTile';

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
  const filterVibe = searchParams.get('filterVibe') ?? undefined;

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
  // an earlier start on purpose. A payload that was cached on an earlier day
  // (the offline fallback serves one) still carries that day's rows; they would
  // otherwise sit above "Tonight".
  const startParam = searchParams.get('from');
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
                <div className="mb-3 flex items-center gap-3">
                  <DayTile date={date} today={isToday(date)} />
                  <h2
                    className="shrink-0 leading-none"
                    style={{
                      fontFamily: 'Inter, system-ui',
                      fontWeight: 800,
                      fontSize: 20,
                      letterSpacing: '-0.02em',
                      color: 'var(--fg)',
                    }}
                  >
                    {label}
                  </h2>
                  <span
                    className="shrink-0 uppercase text-fg-subtle"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10.5,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {copy.showCount(dateEvents.length)}
                  </span>
                </div>
                {/* B+ cards the rows, so a gap replaces the dividers. */}
                <div className="flex flex-col gap-2.5">
                  {dateEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      show={fromEventWithVenue(event, {
                        isWatching: effectiveWatchedIds.has(event.id),
                      })}
                      surface="browse"
                      filterVibe={filterVibe}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {isFetchingNextPage && (
        <div className="mt-2 flex flex-col">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                animation: `skeletonPulse 1.4s ease-in-out ${idx * 0.07}s infinite`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    height: 13,
                    width: '60%',
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: '40%',
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && (
        <div className="mt-8 flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-4 text-[13px] font-bold text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1"
          >
            {copy.loadMore}
          </button>
        </div>
      )}
    </>
  );
};
