import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, isNull, like, ne, or } from 'drizzle-orm';
import { db, artists, mbArtists, userArtistFollows } from '@concert-crawl/db';
import {
  ARTIST_SLUG_MAX_LENGTH,
  BULK_FOLLOW_MAX_SLUGS,
  artistSlug,
  canonicalizeArtist,
  resolveSlug,
} from '@concert-crawl/types';
import type {
  ArtistFollowResponse,
  BulkFollowResponse,
  BulkFollowResult,
  FollowedArtist,
} from '@concert-crawl/types';
import { loadNextShowByCanonical } from '../lib/artist-follows.js';
import { requireSignedIn } from '../middleware/auth.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import { servableArtistPhotoUrl } from '../lib/artist-photo.js';

/**
 * Follow / unfollow an artist (#1115, PR-D).
 *
 * Every signed-in account can follow and unfollow (going free, 2026-10-29):
 * there is no plan gate here, only the 401 for an anonymous caller. If a plan
 * gate ever returns, put it on POST only: DELETE and the GET list stay open so
 * a downgrade never strands rows a user cannot see or remove.
 *
 * This router writes `user_artist_follows` and NOTHING else. It must never
 * call the Spotify API: the button does not follow the artist on the user's
 * Spotify account (brief §3.5). A regression test asserts zero Spotify calls.
 */
export const artistFollowsRouter = new Hono();

artistFollowsRouter.use('*', clerkMiddleware());

const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(ARTIST_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9-]+$/),
});

const notFound = { success: false, error: 'Artist not found' } as const;
const unauthorized = { success: false, error: 'Unauthorized' } as const;

const slugValidator = zValidator('param', slugParamSchema, (result, ctx) => {
  if (!result.success) return ctx.json(notFound, 404);
});

// POST /v1/artists/:slug/follow
artistFollowsRouter.post(
  '/:slug/follow',
  requireSignedIn,
  slugValidator,
  async (ctx) => {
    const authInfo = getAuth(ctx);
    if (!authInfo?.userId) return ctx.json(unauthorized, 401);

    const { slug } = ctx.req.valid('param');

    const [artist] = await db
      .select({
        name: artists.name,
        canonicalName: artists.canonicalName,
        spotifyArtistId: artists.spotifyArtistId,
      })
      .from(artists)
      // A hidden row (#1342) 404s here exactly like the detail route: you cannot
      // start following something with no page. DELETE deliberately does NOT
      // filter — a user who followed before an admin hid the row must still be
      // able to unfollow it.
      .where(and(eq(artists.slug, slug), eq(artists.hidden, false)));

    if (!artist) return ctx.json(notFound, 404);

    // Read-before-insert so a repeat follow is a cheap no-op rather than a
    // wasted write. It is not the correctness guarantee — two concurrent
    // requests can both pass it. The partial unique index
    // (user_id, canonical_name) WHERE source='manual' is what actually makes
    // this idempotent; see migration 0070.
    const [existing] = await db
      .select({ id: userArtistFollows.id })
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, authInfo.userId),
          eq(userArtistFollows.canonicalName, artist.canonicalName),
          eq(userArtistFollows.source, 'manual'),
        ),
      )
      .limit(1);

    if (!existing) {
      await db
        .insert(userArtistFollows)
        .values({
          userId: authInfo.userId,
          artistName: artist.name,
          canonicalName: artist.canonicalName,
          // Copied from the projection when the artist is matched, so a later
          // Spotify sync can reconcile against the same id. Null is fine.
          spotifyArtistId: artist.spotifyArtistId,
          source: 'manual',
        })
        // Untargeted on purpose: it covers whichever unique index the loser of
        // a concurrent double-tap trips, so neither request 500s.
        .onConflictDoNothing();
    }

    const data: ArtistFollowResponse = { following: true };
    return ctx.json({ success: true, data });
  },
);

const mbidBodySchema = z.object({ mbid: z.string().uuid() });

const conflict = {
  success: false,
  error: 'Another artist already holds this name',
} as const;

const mbidValidator = zValidator('json', mbidBodySchema, (result, ctx) => {
  if (!result.success) {
    return ctx.json({ success: false, error: 'Invalid request' }, 400);
  }
});

/**
 * Follows by MBID per user per hour. A follow can create an `artists` row for
 * any of the slim table's millions of acts, and that row then holds against
 * prune and gets matched against Spotify, so the route is bounded before any
 * client can call it. A placeholder until the search UI shows real use.
 */
export const MBID_FOLLOW_LIMIT = 30;
const MBID_FOLLOW_WINDOW_MS = 60 * 60 * 1000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface FollowTarget {
  name: string;
  canonicalName: string;
  spotifyArtistId: string | null;
}

type TargetLookup =
  | { kind: 'row'; row: FollowTarget }
  | { kind: 'not_found' }
  | { kind: 'conflict' }
  | { kind: 'absent'; name: string; canonicalName: string };

// A function, not a module constant: reading `artists.*` at import time breaks
// every suite that mocks `@concert-crawl/db` without the table.
const targetColumns = () => ({
  name: artists.name,
  canonicalName: artists.canonicalName,
  spotifyArtistId: artists.spotifyArtistId,
  mbid: artists.mbid,
  hidden: artists.hidden,
  matchStatus: artists.matchStatus,
});

/**
 * No page, no follow: a row an admin hid (#1342) or ruled not an act reads as
 * not found, exactly as it does on the artist page.
 */
const unfollowable = (row: { hidden: boolean; matchStatus: string }) =>
  row.hidden || row.matchStatus === 'not_an_artist';

/**
 * Finds the `artists` row a follow of this MBID lands on, without writing.
 *
 * The row that already holds the MBID wins. Failing that, the MusicBrainz act
 * is looked up in the slim table, and its canonical name decides: a row with
 * that name and no MBID is the same act as far as anything can tell, so the
 * follow lands on it by name and the MBID goes on the follow only (one user's
 * pick never rewrites the identity every reader sees). A row with that name
 * and a different MBID is a different act holding the name, and `canonical_name`
 * is unique, so the follow is refused rather than merged into the wrong act
 * (orchestrator ruling, 2026-11-22). No row at all means one is created.
 */
const lookUpTarget = async (tx: Tx, mbid: string): Promise<TargetLookup> => {
  const [byMbid] = await tx
    .select(targetColumns())
    .from(artists)
    .where(eq(artists.mbid, mbid));
  if (byMbid) {
    return unfollowable(byMbid)
      ? { kind: 'not_found' }
      : { kind: 'row', row: byMbid };
  }

  const [act] = await tx
    .select({ name: mbArtists.name })
    .from(mbArtists)
    .where(eq(mbArtists.mbid, mbid));
  if (!act) return { kind: 'not_found' };

  const canonicalName = canonicalizeArtist(act.name);
  if (canonicalName === '') return { kind: 'not_found' };

  const [byName] = await tx
    .select(targetColumns())
    .from(artists)
    .where(eq(artists.canonicalName, canonicalName));
  if (!byName) return { kind: 'absent', name: act.name, canonicalName };
  // Checked before the conflict, so a hidden row answers 404 whatever MBID it
  // holds rather than confirming it exists with a 409.
  if (unfollowable(byName)) return { kind: 'not_found' };
  if (byName.mbid !== null) return { kind: 'conflict' };
  return { kind: 'row', row: byName };
};

/**
 * Creates the lightweight row for an act we have never billed: name, canonical
 * name, slug and MBID, nothing from Spotify. `match_status` stays `unmatched`,
 * so the daily match job picks it up like any new row.
 */
const createArtistRow = async (
  tx: Tx,
  mbid: string,
  name: string,
  canonicalName: string,
): Promise<void> => {
  const base = artistSlug(canonicalName);
  const takenRows =
    base === ''
      ? []
      : await tx
          .select({ slug: artists.slug })
          .from(artists)
          .where(or(eq(artists.slug, base), like(artists.slug, `${base}-%`)));
  const slug = resolveSlug(
    base,
    new Set(takenRows.map((row) => row.slug)),
    canonicalName,
  );
  await tx
    .insert(artists)
    .values({ name, canonicalName, slug, mbid })
    // Untargeted: a concurrent follow (or crawl write-through) may claim the
    // name, the slug or the MBID first. The caller looks the row up again.
    .onConflictDoNothing();
};

type FollowOutcome = 'followed' | 'not_found' | 'conflict' | 'retry';

/**
 * One transaction, so a new row and the follow that holds it commit together:
 * a prune run between the two can never see the row unheld and reap it.
 */
const followByMbid = async (
  userId: string,
  mbid: string,
): Promise<FollowOutcome> =>
  db.transaction(async (tx) => {
    let target = await lookUpTarget(tx, mbid);
    if (target.kind === 'absent') {
      await createArtistRow(tx, mbid, target.name, target.canonicalName);
      target = await lookUpTarget(tx, mbid);
    }
    if (target.kind === 'not_found') return 'not_found';
    if (target.kind === 'conflict') return 'conflict';
    // The insert lost a race on the slug alone and nothing holds the name:
    // rare enough that a retry from the client is the right answer.
    if (target.kind === 'absent') return 'retry';

    const { row } = target;
    await tx
      .insert(userArtistFollows)
      .values({
        userId,
        artistName: row.name,
        // The join key every follow reader uses, so it must be the row's own.
        canonicalName: row.canonicalName,
        spotifyArtistId: row.spotifyArtistId,
        source: 'manual',
        mbid,
      })
      .onConflictDoNothing();

    // A user who followed this row by slug before now has its MBID recorded
    // too, so the follow holds the row against prune like any MBID follow.
    await tx
      .update(userArtistFollows)
      .set({ mbid })
      .where(
        and(
          eq(userArtistFollows.userId, userId),
          eq(userArtistFollows.canonicalName, row.canonicalName),
          eq(userArtistFollows.source, 'manual'),
          isNull(userArtistFollows.mbid),
        ),
      );
    return 'followed';
  });

/**
 * POST /v1/artists/follow — follow a MusicBrainz act by MBID (artist-search
 * plan PR 5). The act may have no Denver show and no `artists` row yet.
 *
 * Dark until the search UI ships: no client calls it yet. To reverse it,
 * remove this route and clear `user_artist_follows.mbid` (an expand-only
 * column nothing else reads); the follows stay as ordinary manual follows, and
 * the next prune run reaps the rows no event bills.
 */
artistFollowsRouter.post(
  '/follow',
  requireSignedIn,
  mbidValidator,
  async (ctx) => {
    const authInfo = getAuth(ctx);
    if (!authInfo?.userId) return ctx.json(unauthorized, 401);

    const limit = await checkRateLimit(
      `artist-follow-mbid:${authInfo.userId}`,
      MBID_FOLLOW_LIMIT,
      MBID_FOLLOW_WINDOW_MS,
      // Fail closed: the limit is what bounds row creation, and the follow
      // writes to the same database the limiter could not reach.
      { onStoreError: 'deny', userId: authInfo.userId },
    );
    if (!limit.allowed) {
      ctx.header('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
      return ctx.json({ success: false, error: 'Too many requests' }, 429);
    }

    const { mbid } = ctx.req.valid('json');
    const outcome = await followByMbid(authInfo.userId, mbid);
    if (outcome === 'not_found') return ctx.json(notFound, 404);
    if (outcome === 'conflict') return ctx.json(conflict, 409);
    if (outcome === 'retry') {
      return ctx.json({ success: false, error: 'Try again' }, 503);
    }

    const data: ArtistFollowResponse = { following: true };
    return ctx.json({ success: true, data });
  },
);

// DELETE /v1/artists/:slug/follow
artistFollowsRouter.delete(
  '/:slug/follow',
  requireSignedIn,
  slugValidator,
  async (ctx) => {
    const authInfo = getAuth(ctx);
    if (!authInfo?.userId) return ctx.json(unauthorized, 401);

    const { slug } = ctx.req.valid('param');

    const [artist] = await db
      .select({ canonicalName: artists.canonicalName })
      .from(artists)
      .where(eq(artists.slug, slug));

    if (!artist) return ctx.json(notFound, 404);

    // Every source, not just 'manual'. Spotify seeds follows but no longer owns
    // them, so this is the one and only way a follow is removed — leaving the
    // imported row behind would make Unfollow a no-op for anyone who connected.
    await db
      .delete(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, authInfo.userId),
          eq(userArtistFollows.canonicalName, artist.canonicalName),
        ),
      );

    // Report the effective state, not the intent. GET /v1/artists/:slug counts a
    // follow from any source except `spotify_top`, which is listening history, so
    // the response has to agree with the very next read rather than assume the
    // delete emptied the set.
    const [remaining] = await db
      .select({ id: userArtistFollows.id })
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, authInfo.userId),
          eq(userArtistFollows.canonicalName, artist.canonicalName),
          ne(userArtistFollows.source, 'spotify_top'),
        ),
      )
      .limit(1);

    const data: ArtistFollowResponse = { following: Boolean(remaining) };
    return ctx.json({ success: true, data });
  },
);

/**
 * Viewer-scoped follow collection, mounted at `/v1/me` (native following eng
 * spec §7.5, §9.3). Separate router from the `/v1/artists`-mounted one above
 * purely because the mount point differs; the semantics are the same table.
 */
export const meArtistFollowsRouter = new Hono();

meArtistFollowsRouter.use('*', clerkMiddleware());

/**
 * GET /v1/me/artist-follows — the viewer's follows, newest first, each with
 * the artist's next Denver date (nullable) and the row's `source`.
 *
 * Signed-in only, like the follow routes: there is no plan gate.
 *
 * A null `nextShow` is a normal, common case ("played Denver before, nothing
 * upcoming"), not an error.
 */
meArtistFollowsRouter.get('/artist-follows', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId) return ctx.json(unauthorized, 401);

  const followRows = await db
    .select({
      artistName: userArtistFollows.artistName,
      canonicalName: userArtistFollows.canonicalName,
      source: userArtistFollows.source,
      createdAt: userArtistFollows.createdAt,
    })
    .from(userArtistFollows)
    .where(eq(userArtistFollows.userId, authInfo.userId))
    .orderBy(
      desc(userArtistFollows.createdAt),
      asc(userArtistFollows.artistName),
    );

  if (followRows.length === 0) {
    return ctx.json({ success: true, data: [] });
  }

  // One entry per artist, not per row. A user can hold BOTH a manual row and a
  // Spotify-sourced one for the same artist: the partial unique index is
  // (user_id, canonical_name) WHERE source='manual', so the two coexist by
  // design and the manual POST inserts its own row without consulting the sync's.
  // Writes stay source-scoped for that reason; reads are source-agnostic, so
  // collapsing here is what keeps the list honest.
  //
  // The manual row wins the tie because it is the one the user owns — a Spotify
  // row disappears the moment they unfollow over there, and reporting that
  // source would make the follow look borrowed when it isn't.
  const followByCanonical = new Map<string, (typeof followRows)[number]>();
  for (const row of followRows) {
    const held = followByCanonical.get(row.canonicalName);
    if (!held || (held.source !== 'manual' && row.source === 'manual')) {
      followByCanonical.set(row.canonicalName, row);
    }
  }
  // Re-sort rather than lean on the Map's insertion order. The SQL ordering is
  // per ROW, and the collapse can swap a newer Spotify row for an older manual
  // one while keeping the newer row's slot — which would leave the list holding
  // a `followedAt` that no longer matches its position.
  const uniqueFollowRows = [...followByCanonical.values()].sort(
    (left, right) =>
      right.createdAt.getTime() - left.createdAt.getTime() ||
      left.artistName.localeCompare(right.artistName),
  );

  const canonicalNames = [...followByCanonical.keys()];

  // Two supporting reads, both keyed on the canonical name: the projection row
  // (for the page link and the photo) and the next date.
  const [projectionRows, nextShows] = await Promise.all([
    db
      .select({
        canonicalName: artists.canonicalName,
        slug: artists.slug,
        photoUrl: servableArtistPhotoUrl(),
      })
      .from(artists)
      // A hidden row (#1342) has no page to route to, so it contributes no
      // slug — the follow itself still lists, because the user made it.
      .where(
        and(
          inArray(artists.canonicalName, canonicalNames),
          eq(artists.hidden, false),
        ),
      ),
    loadNextShowByCanonical(canonicalNames),
  ]);

  const projectionByCanonical = new Map(
    projectionRows.map((row) => [row.canonicalName, row]),
  );

  const data: FollowedArtist[] = uniqueFollowRows.map((row) => {
    const projection = projectionByCanonical.get(row.canonicalName);
    return {
      name: row.artistName,
      slug: projection?.slug ?? null,
      canonicalName: row.canonicalName,
      photoUrl: projection?.photoUrl ?? null,
      source: row.source,
      followedAt: row.createdAt.toISOString(),
      nextShow: nextShows.get(row.canonicalName) ?? null,
    };
  });

  return ctx.json({ success: true, data });
});

// Cap chosen to comfortably exceed the largest realistic commit — the
// onboarding artist step and "Follow all N" on a festival bill — while keeping
// the write bounded. A caller with more than this many picks is not a user.
const bulkFollowSchema = z.object({
  slugs: z
    .array(
      z
        .string()
        .min(1)
        .max(ARTIST_SLUG_MAX_LENGTH)
        .regex(/^[a-z0-9-]+$/),
    )
    .min(1)
    .max(BULK_FOLLOW_MAX_SLUGS),
});

/**
 * POST /v1/me/artist-follows/bulk — commit a whole selection in one write
 * (§9.3). Signed-in only, like single follows.
 *
 * Returns a PER-SLUG result so a partial failure is visible rather than
 * swallowed, and is idempotent: a slug the user already follows comes back
 * `already_following`, which is a success. Re-committing a selection that half
 * landed is therefore safe.
 */
meArtistFollowsRouter.post(
  '/artist-follows/bulk',
  requireSignedIn,
  zValidator('json', bulkFollowSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid slug list' }, 400);
    }
  }),
  async (ctx) => {
    const authInfo = getAuth(ctx);
    if (!authInfo?.userId) return ctx.json(unauthorized, 401);

    const { slugs } = ctx.req.valid('json');
    // A duplicated slug in the body is the caller's bug, not a conflict — dedupe
    // and answer once per distinct slug, preserving first-seen order.
    const requestedSlugs = [...new Set(slugs)];

    const artistRows = await db
      .select({
        slug: artists.slug,
        name: artists.name,
        canonicalName: artists.canonicalName,
        spotifyArtistId: artists.spotifyArtistId,
      })
      .from(artists)
      // Hidden rows 404 on the single-artist POST; here they simply report
      // `artist_not_found`, which is the same answer in list form.
      .where(
        and(inArray(artists.slug, requestedSlugs), eq(artists.hidden, false)),
      );

    const artistBySlug = new Map(artistRows.map((row) => [row.slug, row]));

    // Read across EVERY source, not just 'manual'. `already_following` reports
    // what the user can see, and every read in this feature is source-agnostic
    // — an artist a Spotify sync already holds shows as followed everywhere,
    // so calling it `followed` here would contradict the screen the caller
    // just came from.
    const existingRows =
      artistRows.length === 0
        ? []
        : await db
            .select({
              canonicalName: userArtistFollows.canonicalName,
              source: userArtistFollows.source,
            })
            .from(userArtistFollows)
            .where(
              and(
                eq(userArtistFollows.userId, authInfo.userId),
                inArray(
                  userArtistFollows.canonicalName,
                  artistRows.map((row) => row.canonicalName),
                ),
              ),
            );

    const alreadyFollowing = new Set(
      existingRows.map((row) => row.canonicalName),
    );
    // The write stays manual-scoped, matching the single POST. A Spotify row is
    // owned by the sync and vanishes when the user unfollows over there, so a
    // deliberate pick still earns its own manual anchor even though the status
    // above already reads `already_following`.
    const manuallyFollowing = new Set(
      existingRows
        .filter((row) => row.source === 'manual')
        .map((row) => row.canonicalName),
    );

    const toInsert: Array<typeof userArtistFollows.$inferInsert> = [];
    const results: BulkFollowResult[] = requestedSlugs.map((slug) => {
      const artist = artistBySlug.get(slug);
      if (!artist) return { slug, status: 'artist_not_found' };
      const wasVisiblyFollowed = alreadyFollowing.has(artist.canonicalName);
      // Two slugs can canonicalize to the same artist; the second adds nothing,
      // so the insert set stays unique.
      if (!manuallyFollowing.has(artist.canonicalName)) {
        manuallyFollowing.add(artist.canonicalName);
        toInsert.push({
          userId: authInfo.userId,
          artistName: artist.name,
          canonicalName: artist.canonicalName,
          spotifyArtistId: artist.spotifyArtistId,
          source: 'manual',
        });
      }
      alreadyFollowing.add(artist.canonicalName);
      return {
        slug,
        status: wasVisiblyFollowed ? 'already_following' : 'followed',
      };
    });

    if (toInsert.length > 0) {
      // Untargeted on purpose, matching the single POST: it covers whichever
      // unique index a concurrent double-commit trips, so neither request 500s.
      await db.insert(userArtistFollows).values(toInsert).onConflictDoNothing();
    }

    const data: BulkFollowResponse = {
      results,
      // Counts what the user newly gains, which is not `toInsert.length`: an
      // artist a Spotify sync already holds still earns a manual anchor row
      // while reporting `already_following`.
      followedCount: results.filter((row) => row.status === 'followed').length,
    };
    return ctx.json({ success: true, data });
  },
);
