'use client';

import { useEffect, useRef } from 'react';
import type { EventWithVenue } from '@concert-crawl/types';
import { EventRow, fromEventWithVenue } from '../event-row';

interface VenueEventListProps {
  events: EventWithVenue[];
  highlightId?: string;
  watchedIds?: string[];
}

export function VenueEventList({
  events,
  highlightId,
  watchedIds = [],
}: VenueEventListProps) {
  const highlightRef = useRef<HTMLDivElement>(null);
  const watchedSet = new Set(watchedIds);

  useEffect(() => {
    if (!highlightId || !highlightRef.current) return;
    const el = highlightRef.current;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'center',
    });
    if (!reducedMotion) {
      el.dataset['highlighted'] = 'true';
      const timer = setTimeout(() => {
        delete el.dataset['highlighted'];
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

  if (events.length === 0) return null;

  // Design addendum 2 (#178) item 17: Upcoming is ungrouped. A venue's list is
  // short and each row states its own date (the venue surface carries only the
  // venue), so there are no date headers, as `bp-venue` draws it.
  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => (
        <div
          key={event.id}
          ref={event.id === highlightId ? highlightRef : undefined}
        >
          <EventRow
            show={fromEventWithVenue(event, {
              isWatching: watchedSet.has(event.id),
            })}
            surface="venue"
          />
        </div>
      ))}
    </div>
  );
}
