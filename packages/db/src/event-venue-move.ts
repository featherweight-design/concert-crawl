import { randomUUID } from 'node:crypto';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { TicketLink, TicketVendor } from '@concert-crawl/types';
import { db } from './client.js';
import { auditLog, eventRedirects, events, venues } from './schema/index.js';

/** The venue fields a ticket link's kind and vendor are derived from. */
export interface MoveVenueTicketContext {
  websiteUrl: string;
  ticketVendor: TicketVendor | null;
}

export interface MoveEventVenueInput {
  eventId: string;
  venueId: string;
  actorId: string;
  /**
   * Today in Denver as YYYY-MM-DD. Called once the row is locked, so a request
   * that waited on the lock across midnight judges by the day it writes on.
   */
  today: () => string;
  /**
   * The crawl's own ticket-link derivation (`deriveTicketLinks` in
   * @concert-crawl/crawler-core), injected because this package sits below
   * the crawler. The links' kind depends on the venue's site and vendor, so
   * they are rebuilt for the new venue.
   */
  deriveTicketLinks: (
    ticketUrl: string | null,
    venue: MoveVenueTicketContext,
  ) => TicketLink[] | null;
}

export interface VenueRef {
  venueId: string | null;
  venueName: string | null;
}

export type MoveEventVenueResult =
  | { kind: 'not_found' }
  | { kind: 'venue_not_found' }
  | { kind: 'unchanged' }
  /** A crawled show still to come: its venue's calendar owns it. */
  | { kind: 'crawled_show' }
  | { kind: 'duplicate'; existingId: string }
  | {
      /** `moved` is the Moved flow; `corrected` a played show's silent fix. */
      kind: 'moved' | 'corrected';
      before: VenueRef;
      after: VenueRef;
      /** The committed `updated_at`, which names this move for the fan-out. */
      updatedAt: Date;
      /** True when the caller tells Watchers after the commit. */
      notifyWatchers: boolean;
    };

/** The crawl key the upsert conflicts on, as stored on an event row. */
interface CrawlKey {
  venueId: string;
  date: string;
  canonicalArtist: string;
  showTime: string | null;
}

const sameShowTime = (column: AnyPgColumn, value: string | null) =>
  value === null ? sql`${column} IS NULL` : sql`${column} = ${value}::time`;

/**
 * The other upcoming row holding this crawl key, which the partial unique
 * index (venue_id, date, canonical_artist, show_time) WHERE upcoming cannot
 * hold alongside the moved show. Null when the key is free.
 */
export const findUpcomingKeyHolder = async (
  executor: Pick<typeof db, 'select'>,
  key: CrawlKey,
  excludeId: string,
): Promise<string | null> => {
  const [row] = await executor
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.venueId, key.venueId),
        eq(events.date, key.date),
        eq(events.status, 'upcoming'),
        eq(events.canonicalArtist, key.canonicalArtist),
        sameShowTime(events.showTime, key.showTime),
        ne(events.id, excludeId),
      ),
    )
    .limit(1);
  return row?.id ?? null;
};

/**
 * Change a show's venue (admin E2-C), in one transaction.
 *
 * Lock order: the event row FOR UPDATE, then the new venue FOR SHARE (so it
 * cannot be removed under the move). That is events first, as the merge and
 * the delete guard take them; no `user_events` row is touched, because the
 * event keeps its id and so keeps its Watchers.
 *
 * A show still to come (or postponed, whatever its date) moves only if an
 * admin added it (`manual`). A crawled one is refused `crawled_show`: its
 * venue's calendar owns it, and at the new venue Pass 2 would stamp it
 * missing and the stale sweep cancel it. A manual move is the Moved flow:
 *   - the old crawl key goes on an `event_redirects` row with reason 'moved',
 *     targeting the show. The old venue's next crawl of the listing finds the
 *     key there, sees the target is at another venue and drops the listing
 *     instead of inserting the show again (`routeMergedListings` in
 *     crawler-core, which also drops it when that crawl loaded its rows
 *     before the move and still sees the show at the old venue). A crawl
 *     that had already read the redirects before this commits cannot see the
 *     move, and may list the show at the old venue once more. The redirect's
 *     `source_id` is a fresh id, not the event's: the event still answers at
 *     its own id, and a later merge of it must not overwrite this key (the
 *     merge upserts on `source_id`);
 *   - any redirect onto this show whose key is the one the show now holds
 *     again (it moved back) has its `source_*` key cleared, since the show
 *     answers to that key itself. The row stays: a merge redirect's
 *     `source_id` is a real former event id that must keep its 307;
 *   - the old room's page goes (`event_url` cleared; `source_url` stays as
 *     crawl provenance), and the seen marks restart (`first_missing_at`
 *     cleared, `last_seen_at` now) so nothing stale carries over;
 *   - Watchers are told after the commit, unless the show is cancelled (they
 *     already heard it is off, as the PATCH's date change rule says).
 *
 * A played show (dated before today in Denver and not postponed), crawled or
 * manual, is a silent correction: no redirect, nobody told.
 *
 * Both audit inside the transaction (`event.venue.move` or
 * `event.venue.correct`, with the venue, ticket links and event page before
 * and after), so the move, its redirect and its record commit together. The
 * same venue changes nothing and audits nothing.
 *
 * An upcoming show whose key is already held at the new venue comes back
 * `duplicate` with the holder, before anything is written. A holder inserted
 * after that check fails the update on the unique index; the caller maps it.
 */
export const moveEventVenue = async ({
  eventId,
  venueId,
  actorId,
  today,
  deriveTicketLinks,
}: MoveEventVenueInput): Promise<MoveEventVenueResult> =>
  db.transaction(async (tx): Promise<MoveEventVenueResult> => {
    const [row] = await tx
      .select({
        venueId: events.venueId,
        date: events.date,
        canonicalArtist: events.canonicalArtist,
        showTime: events.showTime,
        status: events.status,
        manual: events.manual,
        ticketUrl: events.ticketUrl,
        ticketLinks: events.ticketLinks,
        eventUrl: events.eventUrl,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .for('update');
    if (!row) return { kind: 'not_found' };
    if (row.venueId === venueId) return { kind: 'unchanged' };

    // Today is read now that the row is locked.
    const corrected = row.date < today() && row.status !== 'postponed';
    if (!corrected && !row.manual) return { kind: 'crawled_show' };

    // A removed venue is gone to the admin too, as for Add a show.
    const [venue] = await tx
      .select({
        name: venues.name,
        websiteUrl: venues.websiteUrl,
        ticketVendor: venues.ticketVendor,
      })
      .from(venues)
      .where(and(eq(venues.id, venueId), isNull(venues.removedAt)))
      .for('share');
    if (!venue) return { kind: 'venue_not_found' };

    // The room the show was known under, for the audit and the Watchers'
    // copy. `events.venue_id` is ON DELETE SET NULL, so it may be gone.
    const [oldVenue] =
      row.venueId === null
        ? []
        : await tx
            .select({ name: venues.name })
            .from(venues)
            .where(eq(venues.id, row.venueId));

    if (row.status === 'upcoming') {
      const existingId = await findUpcomingKeyHolder(
        tx,
        {
          venueId,
          date: row.date,
          canonicalArtist: row.canonicalArtist,
          showTime: row.showTime,
        },
        eventId,
      );
      if (existingId !== null) return { kind: 'duplicate', existingId };
    }

    const now = new Date();
    const ticketLinks = deriveTicketLinks(row.ticketUrl, venue);
    const eventUrl = corrected ? row.eventUrl : null;
    const [updated] = await tx
      .update(events)
      .set({
        venueId,
        ticketLinks,
        updatedAt: now,
        ...(!corrected && {
          eventUrl: null,
          firstMissingAt: null,
          lastSeenAt: now,
        }),
      })
      .where(eq(events.id, eventId))
      .returning({ updatedAt: events.updatedAt });
    if (!updated) throw new Error('Event disappeared mid-move');

    let redirectSourceId: string | null = null;
    if (!corrected) {
      await tx
        .update(eventRedirects)
        .set({
          sourceVenueId: null,
          sourceDate: null,
          sourceCanonicalArtist: null,
          sourceShowTime: null,
        })
        .where(
          and(
            eq(eventRedirects.targetId, eventId),
            eq(eventRedirects.sourceVenueId, venueId),
            eq(eventRedirects.sourceDate, row.date),
            eq(eventRedirects.sourceCanonicalArtist, row.canonicalArtist),
            sameShowTime(eventRedirects.sourceShowTime, row.showTime),
          ),
        );
      redirectSourceId = randomUUID();
      await tx.insert(eventRedirects).values({
        sourceId: redirectSourceId,
        targetId: eventId,
        reason: 'moved',
        sourceVenueId: row.venueId,
        sourceDate: row.date,
        sourceCanonicalArtist: row.canonicalArtist,
        sourceShowTime: row.showTime,
      });
    }

    const before: VenueRef = {
      venueId: row.venueId,
      venueName: oldVenue?.name ?? null,
    };
    const after: VenueRef = { venueId, venueName: venue.name };
    const notifyWatchers = !corrected && row.status !== 'cancelled';

    await tx.insert(auditLog).values({
      actorId,
      action: corrected ? 'event.venue.correct' : 'event.venue.move',
      targetId: eventId,
      metadata: {
        before,
        after,
        date: row.date,
        status: row.status,
        ticketLinks: { before: row.ticketLinks, after: ticketLinks },
        eventUrl: { before: row.eventUrl, after: eventUrl },
        redirectSourceId,
        notifyWatchers,
      },
    });

    return {
      kind: corrected ? 'corrected' : 'moved',
      before,
      after,
      updatedAt: updated.updatedAt,
      notifyWatchers,
    };
  });
