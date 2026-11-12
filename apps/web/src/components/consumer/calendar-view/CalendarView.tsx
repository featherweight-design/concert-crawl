'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  parseListParam,
  type EventsAvailabilityResponse,
  type EventWithVenue,
} from '@concert-crawl/types';
import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row';
import { EmptyState } from '@/components/consumer/empty-state';
import {
  WeekStrip,
  WeekStripHeader,
  type WeekStripDay,
} from '@/components/consumer/week-strip';
import { DayHeader } from '@/components/consumer/events-list/DayHeader';
import { dateGroupLabel } from '@/components/consumer/definitions/lib';
import {
  monthLabelFor,
  pickerWindow,
  weekOffsetForDate,
} from '@/components/consumer/jump-picker/date-math';
import { useAvailability } from '@/lib/queries/use-availability';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { dayGenreColors } from './day-genres';

const copy = CONSUMER_COPY;

interface CalendarViewProps {
  days: WeekStripDay[];
  events: EventWithVenue[];
  initialSelectedDate: string;
  today: string;
  watchedIds: string[];
  prevWeekHref: string | null;
  nextWeekHref: string;
  // SSR-prefetched availability window; seeds the jump picker's react-query
  // cache so all in-picker month paging is client-side.
  initialAvailability?: EventsAvailabilityResponse | undefined;
}

export function CalendarView({
  days,
  events,
  initialSelectedDate,
  today,
  watchedIds,
  prevWeekHref,
  nextWeekHref,
  initialAvailability,
}: CalendarViewProps) {
  // The calendar is Browse's other rendering, on the same route and the same
  // filter, so the genre reorder has to reach it too or switching views loses it.
  const filterVibes = parseListParam(useSearchParams().getAll('filterVibe'));
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  // A cross-week jump soft-navigates via router.push, so Next.js re-renders this
  // component with a fresh initialSelectedDate but React keeps the old useState
  // value. Adjust state during render when the prop changes so the selection
  // follows the new week instead of filtering it against the stale date.
  const [syncedInitialDate, setSyncedInitialDate] =
    useState(initialSelectedDate);
  if (initialSelectedDate !== syncedInitialDate) {
    setSyncedInitialDate(initialSelectedDate);
    setSelectedDate(initialSelectedDate);
  }
  // Derived client-side so the cue label tracks in-week picks that cross a
  // month boundary (no server re-render happens for those).
  const monthLabel = useMemo(() => monthLabelFor(selectedDate), [selectedDate]);
  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds]);
  const router = useRouter();

  const { from, to } = pickerWindow(today);
  const { data: availability } = useAvailability({
    from,
    to,
    ...(initialAvailability !== undefined
      ? { initialData: initialAvailability }
      : {}),
  });

  const dayGenres = useMemo(() => dayGenreColors(events), [events]);

  const weekDates = useMemo(() => new Set(days.map((day) => day.date)), [days]);

  // Picking a date inside the current rendered week stays client-side (no fetch,
  // no navigation). Picking a date outside it re-paginates via router.push,
  // preserving every active filter param (mirrors calNextWeekHref param-copy).
  const onJumpPick = (iso: string) => {
    if (weekDates.has(iso)) {
      // Same client-side select + URL-sync as tapping a day in the strip.
      handleDateSelect(iso);
      return;
    }
    const offset = weekOffsetForDate(iso, today);
    const params = new URLSearchParams(window.location.search);
    params.delete('offset');
    params.set('view', 'cal');
    params.set('weekOffset', String(offset));
    params.set('selectedDate', iso);
    router.push(`/events?${params.toString()}`);
  };

  const filteredEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, EventWithVenue[]>();
    for (const event of filteredEvents) {
      const key = event.date;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(event);
    }
    return grouped;
  }, [filteredEvents]);

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    // Sync URL so the selected date is bookmarkable/shareable without
    // triggering a Next.js navigation (which would cause a server re-render).
    const url = new URL(window.location.href);
    url.searchParams.set('selectedDate', date);
    window.history.replaceState(null, '', url.toString());
  }

  return (
    <>
      <WeekStripHeader
        monthLabel={monthLabel}
        selectedDate={selectedDate}
        today={today}
        availability={availability ?? new Map()}
        onPick={onJumpPick}
        prevWeekHref={prevWeekHref}
        nextWeekHref={nextWeekHref}
        showBackToToday={!weekDates.has(today)}
        onBackToToday={() => onJumpPick(today)}
      />
      <WeekStrip
        days={days}
        selectedDate={selectedDate}
        today={today}
        dayGenres={dayGenres}
        onDateSelect={handleDateSelect}
      />

      {groups.size === 0 && (
        <EmptyState
          layout="card"
          glyph="calendar"
          eyebrow={copy.emptyCalEyebrow}
          title={copy.emptyCalTitle}
          body={copy.emptyCalBody}
        />
      )}

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
                  today={date === today}
                />
                {/* Browse rows are carded (B+), so a gap replaces the
                    dividers, as in the list view. */}
                <div className="flex flex-col gap-2.5">
                  {dateEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      show={fromEventWithVenue(event, {
                        isWatching: watchedSet.has(event.id),
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
    </>
  );
}
