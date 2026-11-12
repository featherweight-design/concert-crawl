// The Add-a-show list: past nights a user can stamp "I went" on, newest first,
// back to the start of our records. Visibility is its own rule, not the
// upcoming one and not the Concerts one: a past date already means "happened",
// so `first_missing_at` is ignored (the crawler may have stopped seeing a show
// that took place), while hidden, cancelled and venue-removed rows stay out.

import {
  type SQL,
  and,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, artists, events, userEvents, venues } from '@concert-crawl/db';
import {
  recordsStartFloor,
  type PastShowRow,
  type PastShowsResponse,
  type PastShowsScope,
} from '@concert-crawl/types';
import { followedArtistsCondition } from './artist-follows.js';
import { displayHeadliner, portraitCanonicalName } from './event-billing.js';
import { escapeLikePattern } from './escape-like.js';
import { MT_TIME_ZONE, todayInDenver } from './time.js';

export const PAST_SHOWS_PAGE = 30;

const dateLabelFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: MT_TIME_ZONE,
});

// A plain YYYY-MM-DD anchored at noon UTC so Mountain Time cannot slip it a day.
const dateLabel = (date: string): string =>
  dateLabelFormatter.format(new Date(`${date}T12:00:00Z`));

export interface LoadPastShowsInput {
  userId: string;
  search: string | undefined;
  scope: PastShowsScope;
  /** `${date}_${eventId}` of the last row of the previous page. */
  cursor: string | undefined;
}

export const loadPastShows = async ({
  userId,
  search,
  scope,
  cursor,
}: LoadPastShowsInput): Promise<PastShowsResponse> => {
  const conditions: (SQL | undefined)[] = [
    eq(events.hiddenFromConsumer, false),
    ne(events.status, 'cancelled'),
    isNull(venues.removedAt),
    lt(events.date, todayInDenver()),
    gte(events.date, recordsStartFloor()),
  ];

  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    conditions.push(
      or(
        ilike(events.artist, pattern),
        ilike(events.title, pattern),
        ilike(venues.name, pattern),
      ),
    );
  }

  if (scope === 'venues') {
    // Built here, not at module load: route unit tests mock the db package
    // without `events`, and a module-level alias would throw on import.
    const attended = alias(events, 'attended');
    // Venues the caller has already been to.
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(userEvents)
          .innerJoin(attended, eq(attended.id, userEvents.eventId))
          .where(
            and(
              eq(userEvents.userId, userId),
              isNotNull(userEvents.attendingAt),
              eq(attended.venueId, events.venueId),
            ),
          ),
      ),
    );
  } else if (scope === 'follows') {
    conditions.push(followedArtistsCondition(userId));
  }

  // `total` counts the whole filtered set, so it is taken before the cursor.
  const [counted] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(...conditions));

  if (cursor) {
    // The route's regex guarantees `YYYY-MM-DD_<uuid>`.
    const cursorDate = cursor.slice(0, 10);
    const cursorId = cursor.slice(11);
    conditions.push(
      or(
        lt(events.date, cursorDate),
        and(eq(events.date, cursorDate), lt(events.id, cursorId)),
      ),
    );
  }

  const rows = await db
    .select({
      eventId: events.id,
      artist: displayHeadliner(),
      artistPhotoUrl: artists.photoUrl,
      venueName: venues.name,
      venueSlug: venues.slug,
      date: events.date,
      attendingAt: userEvents.attendingAt,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(artists, eq(portraitCanonicalName(), artists.canonicalName))
    .leftJoin(
      userEvents,
      and(eq(userEvents.eventId, events.id), eq(userEvents.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(desc(events.date), desc(events.id))
    .limit(PAST_SHOWS_PAGE + 1);

  const page = rows.slice(0, PAST_SHOWS_PAGE);
  const last = page[page.length - 1];

  const out: PastShowRow[] = page.map((row) => ({
    eventId: row.eventId,
    artist: row.artist,
    artistPhotoUrl: row.artistPhotoUrl ?? null,
    venueName: row.venueName,
    venueSlug: row.venueSlug,
    date: row.date,
    dateLabel: dateLabel(row.date),
    attendingAt: row.attendingAt?.toISOString() ?? null,
  }));

  return {
    rows: out,
    total: counted?.total ?? 0,
    nextCursor:
      rows.length > PAST_SHOWS_PAGE && last
        ? `${last.date}_${last.eventId}`
        : null,
  };
};
