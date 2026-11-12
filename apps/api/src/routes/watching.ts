// apps/api/src/routes/watching.ts
import { Hono } from 'hono';
import { listedOrDelisted } from '@concert-crawl/db/upcoming-events';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { eq, and, gte, asc, isNull, notExists, or } from 'drizzle-orm';
import {
  db,
  userEvents,
  userEventDismissals,
  events,
  venues,
  artists,
} from '@concert-crawl/db';
import type { WatchingShow, WatchToggleResponse } from '@concert-crawl/types';
import { apiLogger } from '../lib/logger.js';
import {
  loadPriceByTierByEventId,
  lowestHeadlineObservedAt,
  lowestHeadlineSourceCategory,
  lowestHeadlinePrice,
} from '../lib/price-aggregation/index.js';
import { parsePrice } from '../lib/price.js';
import { releaseWatch } from '../lib/user-events.js';
import { resolveArtistSlugs } from '../lib/artist-slugs.js';
import {
  displayHeadliner,
  portraitCanonicalName,
} from '../lib/event-billing.js';
import { idSchema } from '../lib/id-schema.js';
import { todayInDenver } from '../lib/time.js';
import { isSoldOutSql } from '../lib/sold-out.js';

// Watching is FREE for all signed-in plans (locked decision, #781 R6 —
// ENTITLEMENTS_MATRIX.watching). Do NOT add a requireFeature() gate here;
// auth is the only requirement.
export const watchingRouter = new Hono();

watchingRouter.use('*', clerkMiddleware());

// GET /v1/watching — return user's watched upcoming shows
watchingRouter.get('/', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);

  const today = todayInDenver();

  const rows = await db
    .select({
      userEventId: userEvents.id,
      eventId: userEvents.eventId,
      savedPrice: userEvents.savedPrice,
      savedAt: userEvents.createdAt,
      attendingAt: userEvents.attendingAt,
      artist: displayHeadliner(),
      date: events.date,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketLinks: events.ticketLinks,
      ticketPriceMin: events.ticketPriceMin,
      eventStatus: events.status,
      eventDelistedAt: events.delistedAt,
      // watchStatus is the price's state, a separate axis from the show's
      // lifecycle (eventStatus): a cancelled show is not sold out.
      isSoldOut: isSoldOutSql(),
      imageUrl: events.imageUrl,
      genre: events.genre,
      updatedAt: events.updatedAt,
      artistPhotoUrl: artists.photoUrl,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(userEvents)
    .innerJoin(events, eq(userEvents.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    // Headliner portrait, on the same terms as /v1/events: `artists` is a
    // projection keyed on canonicalName with no foreign key, and the unique
    // index on that column is what keeps this join cardinality-preserving.
    .leftJoin(artists, eq(portraitCanonicalName(), artists.canonicalName))
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.status, 'watching'),
        gte(events.date, today),
        // PR 6 — hide non-concert events from the watching list too.
        eq(events.hiddenFromConsumer, false),
        // The same consumer-visibility pair the event detail route applies. A
        // delisted event 404s there, so leaving it in this list rendered a row
        // whose only affordance was a dead link — which is what happened when a
        // show moved venues and the old listing went missing. The crawler clears
        // the flag on re-extraction, so a watch hidden here returns on its own if
        // the show comes back to the venue's calendar.
        listedOrDelisted(),
        // A No longer listed show this person hid stays hidden for them; the
        // show itself is unchanged for everyone else. The dismissal only counts
        // while the show is delisted, so one that returns to the venue's
        // calendar shows again, and is hidden again if it is delisted again.
        or(
          isNull(events.delistedAt),
          notExists(
            db
              .select({ id: userEventDismissals.id })
              .from(userEventDismissals)
              .where(
                and(
                  eq(userEventDismissals.userId, authInfo.userId),
                  eq(userEventDismissals.eventId, events.id),
                ),
              ),
          ),
        ),
      ),
    )
    .orderBy(asc(events.date), asc(events.showTime));

  // The cheapest tier, not events.ticketPriceMin — that scalar holds whatever
  // price was written last and made Watching disagree with the event page
  // (#1365).
  const priceByTierByEventId = await loadPriceByTierByEventId(
    rows.map((row) => row.eventId),
  );

  const data: WatchingShow[] = rows.map((row) => ({
    userEventId: row.userEventId,
    eventId: row.eventId,
    artist: row.artist,
    venueName: row.venueName,
    venueSlug: row.venueSlug,
    date: row.date,
    showTime: row.showTime ?? null,
    ticketUrl: row.ticketUrl ?? null,
    ticketLinks: row.ticketLinks ?? null,
    savedAt: row.savedAt.toISOString(),
    savedPrice: parsePrice(row.savedPrice ?? null),
    // Falls back to the scalar for crawler-sourced prices, which have no
    // corroborated submissions to aggregate — same order Browse uses.
    currentPrice:
      lowestHeadlinePrice(priceByTierByEventId.get(row.eventId) ?? []) ??
      parsePrice(row.ticketPriceMin ?? null),
    // Reads the same headline as currentPrice above, so the provenance chip
    // always describes the price rendered beside it. Sourcing it from the
    // event scalar instead let the two disagree (#1364/#1365/#1366 class).
    priceSourceCategory: lowestHeadlineSourceCategory(
      priceByTierByEventId.get(row.eventId) ?? [],
    ),
    eventStatus: row.eventStatus,
    eventDelistedAt: row.eventDelistedAt?.toISOString() ?? null,
    watchStatus: row.isSoldOut ? 'soldout' : 'live',
    updatedAt: row.updatedAt.toISOString(),
    priceObservedAt: lowestHeadlineObservedAt(
      priceByTierByEventId.get(row.eventId) ?? [],
    ),
    imageUrl: row.imageUrl ?? null,
    artistPhotoUrl: row.artistPhotoUrl ?? null,
    genres: row.genre ?? [],
    attendingAt: row.attendingAt?.toISOString() ?? null,
  }));

  // Per person (the dismissal filter above): no shared cache may hold it.
  ctx.header('Cache-Control', 'private, no-store');
  return ctx.json({ success: true, data });
});

// POST /v1/watching/:eventId/dismiss — hide a No longer listed show from my own
// lists. It must be a show I am watching and that is delisted right now; the
// show is unchanged for everyone else. Idempotent. DELETE below is the Undo.
watchingRouter.post('/:eventId/dismiss', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);
  const parsed = idSchema.safeParse(ctx.req.param('eventId'));
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400);
  }
  const eventId = parsed.data;

  // One transaction under a lock on my watch row, so an Unwatch (which takes the
  // same row) cannot slip between the check and the write.
  const userId = authInfo.userId;
  const outcome = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ delistedAt: events.delistedAt })
      .from(userEvents)
      .innerJoin(events, eq(userEvents.eventId, events.id))
      .where(
        and(
          eq(userEvents.userId, userId),
          eq(userEvents.eventId, eventId),
          eq(userEvents.status, 'watching'),
        ),
      )
      .limit(1)
      .for('update', { of: userEvents });
    // Not on my list, or not a show I watch: the same answer either way.
    if (!row) return 'not_found' as const;
    if (row.delistedAt === null) return 'not_delisted' as const;
    await tx
      .insert(userEventDismissals)
      .values({ userId, eventId })
      .onConflictDoNothing();
    return 'dismissed' as const;
  });
  if (outcome === 'not_found') {
    return ctx.json({ success: false, error: 'Event not found' }, 404);
  }
  if (outcome === 'not_delisted') {
    return ctx.json(
      {
        success: false,
        error: 'Only a show that is no longer listed can be hidden',
        code: 'not_delisted',
      },
      409,
    );
  }
  return ctx.json({ success: true, data: { dismissed: true } });
});

// DELETE /v1/watching/:eventId/dismiss — Undo: show it in my lists again.
// Idempotent: nothing to undo is still a success.
watchingRouter.delete('/:eventId/dismiss', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);
  const parsed = idSchema.safeParse(ctx.req.param('eventId'));
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400);
  }

  await db
    .delete(userEventDismissals)
    .where(
      and(
        eq(userEventDismissals.userId, authInfo.userId),
        eq(userEventDismissals.eventId, parsed.data),
      ),
    );
  return ctx.json({ success: true, data: { dismissed: false } });
});

// PUT /v1/watching/:eventId — toggle watch on/off
watchingRouter.put('/:eventId', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);

  const eventIdRaw = ctx.req.param('eventId');
  const parsed = idSchema.safeParse(eventIdRaw);
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400);
  }
  const eventId = parsed.data;

  // Check for any existing row for this user+event (regardless of status),
  // so we don't violate the unique (user_id, event_id) index on insert.
  const [existing] = await db
    .select({ id: userEvents.id, status: userEvents.status })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.eventId, eventId),
      ),
    )
    .limit(1);

  if (existing?.status === 'watching') {
    // Already watching — release it. Not a bare DELETE: the row may also carry
    // attendance, which must survive un-watching (#70).
    await releaseWatch(authInfo.userId, eventId);

    const response: WatchToggleResponse = {
      watching: false,
      savedPrice: null,
      // Nothing is watched any more, so there is no row for the follow nudge
      // to key on and no artist to nudge about.
      userEventId: null,
      artist: null,
      artistSlug: null,
    };
    return ctx.json({ success: true, data: response });
  }

  // Not watching — fetch current price and upsert to watching.
  // PR 6 — non-concert events are 404 for consumers, including the watch flow.
  // Delisted events are 404 for the same reason. The release branch above runs
  // first, so un-watching a show that went missing while watched still works.
  const [eventRow] = await db
    .select({
      ticketPriceMin: events.ticketPriceMin,
      artist: displayHeadliner(),
    })
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.hiddenFromConsumer, false),
        listedOrDelisted(),
      ),
    )
    .limit(1);

  if (!eventRow) {
    return ctx.json({ success: false, error: 'Event not found' }, 404);
  }

  const currentPriceRaw = eventRow.ticketPriceMin ?? null;
  const savedPrice = parsePrice(currentPriceRaw);
  const savedPriceStr = savedPrice !== null ? String(savedPrice) : null;

  // `.returning()` rather than a follow-up SELECT: the id the nudge keys on
  // must be the id this very write produced, and the conflict branch can
  // resurrect a row that a concurrent request just replaced.
  let userEventId: string;
  try {
    const [written] = await db
      .insert(userEvents)
      .values({
        userId: authInfo.userId,
        eventId,
        status: 'watching',
        savedPrice: savedPriceStr,
      })
      .onConflictDoUpdate({
        target: [userEvents.userId, userEvents.eventId],
        set: { status: 'watching', savedPrice: savedPriceStr },
      })
      .returning({ id: userEvents.id });
    if (!written) throw new Error('watch upsert returned no rows');
    userEventId = written.id;
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'watch upsert failed',
    );
    return ctx.json({ success: false, error: 'Failed to save watch' }, 500);
  }

  // The nudge invites the viewer to follow the headliner, so it needs a slug.
  // A name the artists projection has no row for is normal (see
  // resolveArtistSlugs) and simply means there is nothing to follow — the
  // watch itself already succeeded, so a failure here must not fail the write.
  let artistSlug: string | null = null;
  try {
    ({ artistSlug } = await resolveArtistSlugs(eventRow.artist, null));
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'watch toggle artist slug resolution failed',
    );
  }

  const response: WatchToggleResponse = {
    watching: true,
    savedPrice,
    userEventId,
    artist: eventRow.artist,
    artistSlug,
  };
  return ctx.json({ success: true, data: response });
});
