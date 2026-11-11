// apps/api/src/routes/admin/artists.ts
//
// Admin review surface for the Spotify identity match (#1115, plan PR-C
// Task 9). `ambiguous` is a human queue, not an error: more than one Spotify
// artist matched the canonical name exactly, and guessing would put the wrong
// press photo on a public page. An admin resolves it by picking from the
// candidates the matcher saw, or by pasting a Spotify artist id by hand.
import { Hono } from 'hono';
import { createLogger } from '@concert-crawl/logger';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import {
  and,
  asc,
  eq,
  ne,
  ilike,
  isNotNull,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  artistReports,
  artists,
  db,
  userArtistFollows,
  userProfiles,
  type SpotifyCandidateSnapshot,
} from '@concert-crawl/db';
import { canonicalizeArtist } from '@concert-crawl/crawler-core/canonical';
import { getAuthUser } from '../../middleware/auth.js';
import {
  isAutoMatchedExpr,
  isConfirmedMatchExpr,
} from '../../lib/artist-auto-match.js';
import {
  isExhaustedBucketExpr,
  isExhaustibleStatus,
  isNotExhaustedExpr,
} from '../../lib/artist-exhaustion.js';
import { loadNextShowByCanonical } from '../../lib/artist-follows.js';
import { closeOpenArtistReports } from '../../lib/artist-reports.js';
import { hasUpcomingShowExpr } from '../../lib/artist-upcoming.js';
import { httpUrl } from '../../lib/url-schema.js';
import {
  dedupeCandidates,
  toCandidateSnapshot,
} from '../../lib/artist-match.js';
import {
  createSpotifyAppClient,
  type SpotifyAppClient,
} from '../../lib/spotify-app-client.js';
import { SpotifyAuthError, SpotifyRateLimitError } from '../../lib/spotify.js';
import type { AdminVariables } from './index.js';
import { idSchema } from '../../lib/id-schema.js';

const logger = createLogger('admin:artists');

const matchStatusSchema = z.enum([
  'unmatched',
  'matched',
  'ambiguous',
  'no_match',
  'not_an_artist',
]);

/**
 * What the admin queue can be filtered by: the five verdicts, plus the
 * derived `exhausted` and `auto_matched` buckets. `matched` lists only
 * confirmed matches; a best-effort pick sits under `auto_matched` until a
 * human answers it.
 *
 * `exhausted` is not a matchStatus and never will be — it says the job stopped
 * asking, which is orthogonal to what the last answer was. It is a filter value
 * here because the admin surface is a set of queues, and "rows I no longer need
 * to see in the ambiguous queue" is one of them.
 */
const listFilterSchema = z.union([
  matchStatusSchema,
  z.literal('exhausted'),
  // Matched by the best-effort rule and not yet confirmed by a human: the
  // queue an admin checks them in. Disjoint from `matched`, as `exhausted` is
  // from its statuses, so every row is listed and counted in one tab.
  z.literal('auto_matched'),
  // Artists a fan says we matched to the wrong act. Orthogonal to the match
  // status, like the other derived buckets: a row can be reported in any state.
  z.literal('reported'),
]);

// The outer id is written out qualified: inside a subquery drizzle renders a
// bare column name, which would bind to the inner table's own `id`.
// A function, not a constant: several unit suites mock `drizzle-orm` without
// `sql.raw`, and a module-level call would fail at import.
const outerArtistId = (): SQL => sql.raw('"artists"."id"');

const openReportOn = (): SQL =>
  sql`exists (select 1 from ${artistReports} where ${artistReports.artistId} = ${outerArtistId()} and ${artistReports.status} = 'open')`;

/**
 * Whether to hide artists with no show left to see. Defaults ON.
 *
 * The table lists every artist ever derived, and most of them last played
 * months ago — resolving one changes nothing anybody will look at. Defaulting
 * the filter on is what makes the remaining count the count that matters. It is
 * a filter and not a purge: `upcoming=false` still lists everything, and the
 * rows themselves are untouched.
 */
const upcomingParamSchema = z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true');

const listQuerySchema = z.object({
  status: listFilterSchema.optional(),
  upcoming: upcomingParamSchema,
  // An empty `search=` is what a controlled input sends when the admin clears
  // it, and that means "no filter" — not a bad request.
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) =>
      value === undefined || value === '' ? undefined : value,
    ),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Exhausted rows move OUT of the queue they came from rather than sitting in
 * both, and so do auto-matched rows (out of `matched`). The point of giving
 * up on a row is that the admin's ambiguous count
 * visibly drops; a row counted twice never delivers that.
 *
 * The `exhausted` branch and the exhaustible-status branch both gate on
 * EXHAUSTIBLE_STATUSES, and they have to agree: if the `exhausted` filter took
 * any row at the cap, a leftover counter on a `matched` row would list it in
 * two queues while `/counts` credited it to one. `matched` and `auto_matched`
 * split on `auto_matched_at` through lib/artist-auto-match.ts, for the same
 * reason.
 */
const statusFilter = (status: z.infer<typeof listFilterSchema>): SQL =>
  status === 'reported'
    ? openReportOn()
    : status === 'exhausted'
      ? isExhaustedBucketExpr()
      : status === 'auto_matched'
        ? isAutoMatchedExpr()
        : status === 'matched'
          ? isConfirmedMatchExpr()
          : isExhaustibleStatus(status)
            ? sql`${eq(artists.matchStatus, status)} and ${isNotExhaustedExpr()}`
            : eq(artists.matchStatus, status);

const artistIdSchema = z.object({ id: idSchema });

const patchBodySchema = z
  .object({
    spotifyArtistId: z.union([z.string().trim().min(1).max(64), z.null()]),
    matchStatus: matchStatusSchema.optional(),
    photoUrl: z.union([httpUrl(), z.null()]).optional(),
    // "Looks right" on an auto-matched row: confirm the pick only if it is
    // still the row's current, unconfirmed answer. A stale page must never
    // write an old guess over a newer match.
    confirmAutoMatch: z.literal(true).optional(),
  })
  .strict();

export const artistsAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/artists?status=ambiguous&search=&limit=100&offset=0
//
// A search deliberately ignores `status`. An admin who types a name is looking
// for that artist, not for that artist within whichever chip happens to be
// selected — and the row they want is most often in a status they would not
// have guessed, which is why they are searching rather than scanning.
artistsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { status, search, limit, offset, upcoming } = ctx.req.valid('query');

    // A search ignores the upcoming filter for the same reason it ignores
    // `status`: the admin is looking for one named artist, and a row they have
    // to switch a toggle off to find is a row they will conclude is missing.
    const where = search
      ? ilike(artists.canonicalName, `%${search}%`)
      : and(
          status ? statusFilter(status) : undefined,
          upcoming ? hasUpcomingShowExpr() : undefined,
        );

    const rows = await db
      // Named columns rather than `select()`: `spotifyCandidates` is the widest
      // thing on the row and the table never renders it — the picker fetches
      // candidates from its own endpoint when an admin opens one.
      .select({
        id: artists.id,
        name: artists.name,
        canonicalName: artists.canonicalName,
        slug: artists.slug,
        spotifyArtistId: artists.spotifyArtistId,
        matchStatus: artists.matchStatus,
        photoUrl: artists.photoUrl,
        matchCheckedAt: artists.matchCheckedAt,
        hidden: artists.hidden,
        autoMatchedAt: artists.autoMatchedAt,
        nameLockedAt: artists.nameLockedAt,
        // Which chip the row belongs to, which is not always its matchStatus.
        // The page keeps its counts honest by walking the single row that
        // changed, and it can only do that if it knows the bucket it came from.
        isExhausted: isExhaustedBucketExpr(),
        openReportCount: sql<number>`(select count(*)::int from ${artistReports} where ${artistReports.artistId} = ${outerArtistId()} and ${artistReports.status} = 'open')`,
      })
      .from(artists)
      .where(where)
      // Alphabetical: the queue is small and a stable, scannable order beats a
      // recency order an admin can't predict.
      // `name` is not unique — only `canonicalName` and `slug` are — so it
      // needs a tiebreaker, or two artists sharing a display name can straddle
      // a page boundary and be shown twice or not at all.
      .orderBy(asc(artists.name), asc(artists.id))
      .limit(limit)
      .offset(offset);

    // The page needs to know whether a next page exists, and the filtered total
    // is the only thing that answers it — a full page of rows is equally
    // consistent with there being one more row or a thousand.
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(artists)
      .where(where);

    return ctx.json({
      success: true,
      data: rows,
      total: totalRow?.total ?? 0,
    });
  },
);

// GET /v1/admin/artists/counts — queue sizes per match status, plus the
// derived `exhausted` and `auto_matched` buckets. Every count matches what its
// tab lists, so exhausted and auto-matched rows are each counted once, under
// their own bucket.
// It takes the same `upcoming` param as the list, and has to: a chip reading a
// number the table it opens cannot produce is worse than no number at all.
artistsAdminRouter.get(
  '/counts',
  zValidator(
    'query',
    z.object({ upcoming: upcomingParamSchema }),
    validationHook,
  ),
  async (ctx) => {
    const { upcoming } = ctx.req.valid('query');

    // A filtered aggregate rather than a GROUP BY on the bucket expression: it
    // carries bind parameters, and Postgres renders separate placeholders in the
    // select list and the GROUP BY, so it cannot see the two as the same
    // expression and rejects the query.
    const rows = await db
      .select({
        matchStatus: artists.matchStatus,
        total: sql<number>`count(*)::int`,
        exhausted: sql<number>`count(*) filter (where ${isExhaustedBucketExpr()})::int`,
        autoMatched: sql<number>`count(*) filter (where ${isAutoMatchedExpr()})::int`,
      })
      .from(artists)
      .where(upcoming ? hasUpcomingShowExpr() : undefined)
      .groupBy(artists.matchStatus);

    // Reported is its own overlapping bucket (an artist is reported in any
    // match state), so it is counted apart and subtracts from nothing.
    const [reportedRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(artists)
      .where(and(openReportOn(), upcoming ? hasUpcomingShowExpr() : undefined));

    const counts = {
      reported: reportedRow?.total ?? 0,
      unmatched: 0,
      matched: 0,
      ambiguous: 0,
      no_match: 0,
      not_an_artist: 0,
      exhausted: 0,
      auto_matched: 0,
    };
    for (const row of rows) {
      // Each row is counted once, under the tab `statusFilter` lists it in:
      // exhausted rows leave their status's count, and auto-matched rows leave
      // `matched` (the aggregates apply the same gates, so either subtraction
      // is 0 for a status it cannot touch).
      counts.exhausted += row.exhausted;
      counts.auto_matched += row.autoMatched;
      counts[row.matchStatus] += row.total - row.exhausted - row.autoMatched;
    }

    return ctx.json({ success: true, data: counts });
  },
);

// PATCH /v1/admin/artists/:id — resolve a match by hand.
//
// Providing a spotifyArtistId promotes the row to `matched` unless an explicit
// matchStatus says otherwise. Clearing it (null) demotes to `no_match` by
// default. Either way matchConfidence is nulled: a hand-set identity carries
// no algorithmic score, and leaving 1.000 behind would misreport how the row
// was resolved.
artistsAdminRouter.patch(
  '/:id',
  zValidator('param', artistIdSchema, validationHook),
  zValidator('json', patchBodySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');

    const nextStatus =
      body.matchStatus ??
      (body.spotifyArtistId === null ? 'no_match' : 'matched');

    if (body.spotifyArtistId === null && nextStatus === 'matched') {
      return ctx.json(
        {
          success: false,
          error: 'matchStatus "matched" requires a spotifyArtistId',
        },
        400,
      );
    }

    // An identity and a photo only mean anything on a matched row. Rather than
    // let a client write `ambiguous` alongside a live spotifyArtistId — a state
    // the job and the artist page would both read as matched — reject it.
    if (nextStatus !== 'matched' && body.spotifyArtistId !== null) {
      return ctx.json(
        {
          success: false,
          error: `matchStatus "${nextStatus}" requires spotifyArtistId to be null`,
        },
        400,
      );
    }
    if (nextStatus !== 'matched' && body.photoUrl) {
      return ctx.json(
        {
          success: false,
          error: `matchStatus "${nextStatus}" cannot carry a photoUrl`,
        },
        400,
      );
    }

    const [existing] = await db
      .select({
        spotifyArtistId: artists.spotifyArtistId,
        autoMatchedAt: artists.autoMatchedAt,
        matchStatus: artists.matchStatus,
      })
      .from(artists)
      .where(eq(artists.id, id));

    if (!existing) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404);
    }
    if (
      body.confirmAutoMatch === true &&
      (existing.autoMatchedAt === null ||
        existing.spotifyArtistId !== body.spotifyArtistId)
    ) {
      return ctx.json(
        {
          success: false,
          error: 'The auto-match has changed since it was loaded',
        },
        409,
      );
    }

    // The cached photo belongs to the Spotify identity it was fetched for, so
    // it dies whenever that identity does — whether the row is demoted or
    // repointed at a different artist. Leaving it behind is how a stranger's
    // face ends up on a public page, which is the exact failure this queue
    // exists to prevent. The job re-fetches on its next pass.
    const identityChanged = body.spotifyArtistId !== existing.spotifyArtistId;
    const photoFields =
      nextStatus !== 'matched'
        ? { photoUrl: null, photoFetchedAt: null }
        : body.photoUrl !== undefined
          ? {
              photoUrl: body.photoUrl,
              photoFetchedAt: body.photoUrl === null ? null : new Date(),
            }
          : identityChanged
            ? { photoUrl: null, photoFetchedAt: null }
            : {};

    const actor = getAuthUser(ctx);

    // The fix and the closing of its reports commit together. Only a write
    // that changed what the page shows is a fix. "Looks right" on an
    // auto-match, or a save that repeats the current answer, says the page was
    // right all along, so it dismisses instead: no notification.
    const changedThePage =
      body.confirmAutoMatch !== true &&
      (identityChanged ||
        nextStatus !== existing.matchStatus ||
        body.photoUrl !== undefined);
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(artists)
        .set({
          spotifyArtistId: body.spotifyArtistId,
          matchStatus: nextStatus,
          matchConfidence: null,
          matchCheckedAt: new Date(),
          // A human has just looked at this row, so whatever the job gave up on
          // is no longer the current question. Resetting keeps `exhausted`
          // meaning "the job stopped asking" rather than accumulating history.
          matchAttempts: 0,
          // A human answer, even one confirming the same pick, replaces the
          // best-effort rule's.
          autoMatchedAt: null,
          updatedAt: new Date(),
          ...photoFields,
          // `not_an_artist` and `hidden` say the same thing about the same row —
          // there is no act here — but only `hidden` is read by the public
          // surfaces, so a row ruled not-an-artist kept its follow button, its
          // slot on the bill and its own page. Deriving the switch from the
          // verdict is one-directional on purpose: re-matching a row later does
          // not un-hide it, because unhiding is its own deliberate admin action.
          ...(nextStatus === 'not_an_artist' ? { hidden: true } : {}),
        })
        // A confirm re-checks at the write, not just at the read above: the
        // match job can repoint the row in between.
        .where(
          body.confirmAutoMatch === true
            ? and(
                eq(artists.id, id),
                isNotNull(artists.autoMatchedAt),
                eq(artists.spotifyArtistId, body.spotifyArtistId ?? ''),
              )
            : eq(artists.id, id),
        )
        .returning();
      if (row) {
        await closeOpenArtistReports(tx, {
          artist: row,
          outcome: changedThePage ? 'fixed' : 'dismissed',
          resolvedBy: actor.userId,
        });
      }
      return row;
    });

    if (!updated) {
      return body.confirmAutoMatch === true
        ? ctx.json(
            {
              success: false,
              error: 'The auto-match has changed since it was loaded',
            },
            409,
          )
        : ctx.json({ success: false, error: 'Artist not found' }, 404);
    }

    ctx.set(
      'auditAction',
      body.confirmAutoMatch === true
        ? 'artist.match.confirm_auto'
        : 'artist.match.update',
    );
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', {
      spotifyArtistId: body.spotifyArtistId,
      matchStatus: nextStatus,
      // Which answer this replaced, so a confirmed or repointed best-effort
      // pick can be traced.
      previousAutoMatchedAt: existing.autoMatchedAt,
    });

    return ctx.json({ success: true, data: updated });
  },
);

/**
 * Fill in the genres a snapshot is missing.
 *
 * `/search` returns simplified artist objects carrying none, so a snapshot
 * straight from the match job has `genres: null` throughout and the picker's
 * meta line reads "Genres unavailable" on every candidate. Genres live only on
 * the full artist object.
 *
 * Hydrating writes `[]` back for an artist Spotify resolved but listed no
 * genres for, which is the common case now that Spotify has deprecated the
 * field. That distinction is what stops this re-spending ten calls on every
 * subsequent open of the same row.
 *
 * Returns `null` when nothing changed — no candidate needed hydrating, or the
 * call failed. Failing is not a reason to fail the request: the picker is
 * still usable on name and photo alone.
 *
 * Takes a client factory rather than a client so a fully-hydrated snapshot
 * resolves without one: building a client mints an app token over the network.
 */
const hydrateCandidateDetails = async (
  getClient: () => Promise<SpotifyAppClient | null>,
  candidates: SpotifyCandidateSnapshot[],
  artistId: string,
): Promise<SpotifyCandidateSnapshot[] | null> => {
  const missing = candidates.filter((candidate) => candidate.genres === null);
  if (missing.length === 0) return null;

  const client = await getClient();
  if (client === null) return null;

  try {
    const detailsById = await client.fetchArtistDetails(
      missing.map((candidate) => candidate.id),
    );
    // An id Spotify did not resolve stays `null`. Defaulting it would persist
    // "Spotify lists no genres" for an artist we never actually read, and no
    // later open would ever try again.
    if (missing.every((candidate) => !detailsById.has(candidate.id))) {
      return null;
    }
    return candidates.map((candidate) => {
      const detail = detailsById.get(candidate.id);
      // Rebuilt field by field rather than spread: rows snapshotted before
      // February 2026 still carry a `popularity` key in the JSONB, and a spread
      // would write it straight back out.
      return {
        id: candidate.id,
        name: candidate.name,
        imageUrl: candidate.imageUrl,
        genres: candidate.genres ?? detail?.genres ?? null,
        spotifyUrl: candidate.spotifyUrl,
      };
    });
  } catch (err) {
    logger.warn(
      { err, artistId },
      'candidate detail hydration failed — serving candidates unhydrated',
    );
    return null;
  }
};

// GET /v1/admin/artists/:id/candidates?query=&refresh= — what Spotify returned
// for this row.
//
// Cache-first (#1525). The match job already searched this row and now
// snapshots the result onto `artists.spotifyCandidates`, so the common case —
// an admin opening the picker on a queued `ambiguous` row — costs no search at
// all. That reverses the original decision here, which was to re-search on
// every open because a cached column goes stale the moment an artist edits
// their Spotify profile. It still does. What changed is that staleness is now
// handled where it belongs: the picker shows when the snapshot was taken and
// offers `refresh=true`, and nothing is ever auto-resolved from the cache. The
// quota this was spending is the binding constraint on the whole match
// pipeline, and paying it twice for one search bought nothing.
//
// `query` overrides the search term. `no_match` usually means the artist exists under a
// spelling exact matching cannot reach ("Michael Smoak" vs "Mike Smoak"), and
// without an override the endpoint would keep returning the same empty list.
// An override always searches live — it is by definition a different search
// from the one the snapshot holds, and caching it under the canonical name
// would poison the row.
//
// `isExactMatch` marks the candidates the matcher itself accepted — on an
// `ambiguous` row those are precisely the ones that collided, which is the
// question the admin is actually trying to answer. It is recomputed on read
// rather than stored, so a later canonicalization change can never leave a
// snapshot asserting a match the matcher would no longer make.
artistsAdminRouter.get(
  '/:id/candidates',
  zValidator('param', artistIdSchema, validationHook),
  zValidator(
    'query',
    z.object({
      query: z
        .string()
        .trim()
        .max(200)
        .optional()
        .transform((value) =>
          value === undefined || value === '' ? undefined : value,
        ),
      refresh: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => value === 'true'),
    }),
    validationHook,
  ),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { query, refresh } = ctx.req.valid('query');

    const [artist] = await db
      .select({
        canonicalName: artists.canonicalName,
        spotifyCandidates: artists.spotifyCandidates,
        spotifyCandidatesFetchedAt: artists.spotifyCandidatesFetchedAt,
      })
      .from(artists)
      .where(eq(artists.id, id));

    if (!artist) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404);
    }

    const searchTerm = query ?? artist.canonicalName;
    const cached =
      query === undefined && !refresh ? artist.spotifyCandidates : null;

    // Building a client mints or refreshes an app token, so it is itself a
    // Spotify call — deferred until a path needs the network, and memoized so
    // a search plus a hydration still cost one. A fully-hydrated cache hit
    // never calls this, which is what makes the second open free.
    let clientPromise: Promise<SpotifyAppClient | null> | undefined;
    const getClient = () => (clientPromise ??= createSpotifyAppClient());

    const respond = (
      candidates: SpotifyCandidateSnapshot[],
      cachedAt: Date | null,
    ) =>
      ctx.json({
        success: true,
        data: candidates.map((candidate) => ({
          ...candidate,
          isExactMatch:
            canonicalizeArtist(candidate.name) === artist.canonicalName,
        })),
        query: searchTerm,
        cachedAt: cachedAt === null ? null : cachedAt.toISOString(),
      });

    try {
      if (cached !== null) {
        const hydrated = await hydrateCandidateDetails(getClient, cached, id);
        if (hydrated !== null) {
          // Hydration is a round trip, so a concurrent refresh can land a
          // newer snapshot while it runs. Writing then would replace that
          // newer list with the older one this request read. The fetched-at
          // it read is the version to check — no match, no write, and the
          // admin still gets the genres in the response.
          const unchanged =
            artist.spotifyCandidatesFetchedAt === null
              ? isNull(artists.spotifyCandidatesFetchedAt)
              : eq(
                  artists.spotifyCandidatesFetchedAt,
                  artist.spotifyCandidatesFetchedAt,
                );
          await db
            .update(artists)
            .set({ spotifyCandidates: hydrated, updatedAt: new Date() })
            .where(and(eq(artists.id, id), unchanged));
        }
        return respond(hydrated ?? cached, artist.spotifyCandidatesFetchedAt);
      }

      // Null means SPOTIFY_CLIENT_ID/SECRET are unset — the dormant path the
      // whole match feature is built around. That is a configuration state,
      // not a failure of this request, so it gets its own status and message
      // rather than a generic 500. Only the live-search path can reach it: a
      // cache hit is local data, and refusing it because Spotify is
      // unreachable would make the picker useless when it is most needed.
      const client = await getClient();
      if (client === null) {
        return ctx.json(
          {
            success: false,
            error: 'Spotify app credentials are not configured',
          },
          503,
        );
      }

      const found = dedupeCandidates(await client.searchArtists(searchTerm));
      const snapshot = found.map(toCandidateSnapshot);
      const hydrated = await hydrateCandidateDetails(getClient, snapshot, id);
      const candidates = hydrated ?? snapshot;

      // An overridden query answers a different question from the one the row
      // asks, so it is served but never written back.
      const fetchedAt = new Date();
      if (query === undefined) {
        await db
          .update(artists)
          .set({
            spotifyCandidates: candidates,
            spotifyCandidatesFetchedAt: fetchedAt,
            updatedAt: fetchedAt,
          })
          .where(eq(artists.id, id));
      }

      return respond(candidates, query === undefined ? fetchedAt : null);
    } catch (err) {
      logger.warn(
        { err, artistId: id, searchTerm },
        'candidate search failed against Spotify',
      );
      if (err instanceof SpotifyRateLimitError) {
        return ctx.json(
          {
            success: false,
            error:
              'Spotify is rate limiting us — cooldowns usually run for hours',
          },
          429,
        );
      }
      if (err instanceof SpotifyAuthError) {
        return ctx.json(
          { success: false, error: 'Spotify rejected our app credentials' },
          502,
        );
      }
      throw err;
    }
  },
);

// GET /v1/admin/artists/reports/count: how many artists have an open report.
// Counted per artist, not per report, across every date: it is the sidebar's
// "something needs a look" signal, so it ignores the page's upcoming-only
// filter (the Reported chip applies it by default).
artistsAdminRouter.get('/reports/count', async (ctx) => {
  const [row] = await db
    .select({
      total: sql<number>`count(distinct ${artistReports.artistId})::int`,
    })
    .from(artistReports)
    // Joined to the table the chip lists from: `artist_id` has no foreign key,
    // so a report whose artist row is gone must not hold the badge up.
    .innerJoin(artists, eq(artists.id, artistReports.artistId))
    .where(eq(artistReports.status, 'open'));
  return ctx.json({ success: true, data: { count: row?.total ?? 0 } });
});

// GET /v1/admin/artists/:id/reports: what an expanded Reported row shows.
// The open reports, oldest first, and what the page is matched to right now.
artistsAdminRouter.get(
  '/:id/reports',
  zValidator('param', artistIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');

    const [artist] = await db
      .select({
        name: artists.name,
        canonicalName: artists.canonicalName,
        photoUrl: artists.photoUrl,
        spotifyArtistId: artists.spotifyArtistId,
        spotifyCandidates: artists.spotifyCandidates,
      })
      .from(artists)
      .where(eq(artists.id, id));
    if (!artist) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404);
    }

    const reports = await db
      .select({
        id: artistReports.id,
        reason: artistReports.reason,
        note: artistReports.note,
        suggestedSpotifyArtistId: artistReports.suggestedSpotifyArtistId,
        createdAt: artistReports.createdAt,
        reporterHandle: userProfiles.handle,
      })
      .from(artistReports)
      .leftJoin(userProfiles, eq(userProfiles.userId, artistReports.reporterId))
      .where(
        and(eq(artistReports.artistId, id), eq(artistReports.status, 'open')),
      )
      .orderBy(asc(artistReports.createdAt), asc(artistReports.id));

    const [followers] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.canonicalName, artist.canonicalName),
          // Listening history is not a follow (the artist page's own rule).
          ne(userArtistFollows.source, 'spotify_top'),
        ),
      );
    const nextShow =
      (await loadNextShowByCanonical([artist.canonicalName])).get(
        artist.canonicalName,
      ) ?? null;

    const matchedGenres =
      artist.spotifyCandidates?.find(
        (candidate) => candidate.id === artist.spotifyArtistId,
      )?.genres ?? null;

    return ctx.json({
      success: true,
      data: {
        matched: {
          name: artist.name,
          photoUrl: artist.photoUrl,
          spotifyArtistId: artist.spotifyArtistId,
          genres: matchedGenres,
          nextShow,
          followerCount: followers?.total ?? 0,
        },
        reports: reports.map((report) => ({
          ...report,
          createdAt: report.createdAt.toISOString(),
        })),
      },
    });
  },
);

// POST /v1/admin/artists/:id/reports/dismiss: the page is right as it is.
// Closes every open report as `dismissed`; reporters are not notified.
artistsAdminRouter.post(
  '/:id/reports/dismiss',
  zValidator('param', artistIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const actor = getAuthUser(ctx);

    const result = await db.transaction(async (tx) => {
      const [artist] = await tx
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          hidden: artists.hidden,
          matchStatus: artists.matchStatus,
        })
        .from(artists)
        .where(eq(artists.id, id));
      if (!artist) return null;
      const closed = await closeOpenArtistReports(tx, {
        artist,
        outcome: 'dismissed',
        resolvedBy: actor.userId,
      });
      return { slug: artist.slug, closed };
    });

    if (!result) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404);
    }

    ctx.set('auditAction', 'artist.reports.dismiss');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', { slug: result.slug, closed: result.closed });

    return ctx.json({ success: true, data: { closed: result.closed } });
  },
);

// PATCH /v1/admin/artists/:id/visibility — hide or restore an artist page.
//
// Deliberately its own endpoint rather than a field on the identity PATCH
// above. Visibility is orthogonal to the match state machine, and that body
// requires `spotifyArtistId`, so folding hiding into it would mean resending
// an identity just to hide a row — one typo away from wiping it.
//
// Hiding never touches matchStatus: a hidden row keeps flowing through the
// match job, so restoring it needs no repair pass.
artistsAdminRouter.patch(
  '/:id/visibility',
  zValidator('param', artistIdSchema, validationHook),
  zValidator(
    'json',
    z.object({ hidden: z.boolean() }).strict(),
    validationHook,
  ),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { hidden } = ctx.req.valid('json');

    const actor = getAuthUser(ctx);

    // Taking a page down answers every report on it, the same as ruling the
    // row Not an artist: there is no page left to be wrong. Restoring a page
    // changes nothing about reports.
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(artists)
        .set({ hidden, updatedAt: new Date() })
        .where(eq(artists.id, id))
        .returning();
      if (row && hidden) {
        await closeOpenArtistReports(tx, {
          artist: row,
          outcome: 'fixed',
          resolvedBy: actor.userId,
        });
      }
      return row;
    });

    if (!updated) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404);
    }

    ctx.set('auditAction', 'artist.visibility.update');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', { hidden, slug: updated.slug });

    return ctx.json({ success: true, data: updated });
  },
);

// PATCH /v1/admin/artists/:id/name — set an artist's display name by hand, or
// hand it back to the automatic repair.
//
// Its own endpoint for the same reason as visibility: the identity PATCH
// requires `spotifyArtistId`, and a rename must never risk the match.
//
// `{ name }` writes the name and locks it, so the name repair
// (`repair-artist-names`, Spotify respell included) never overrides it — the
// act styles itself `MGMT` or `bbno$` and a human has said so.
// `{ nameLocked: false }` releases the lock and leaves the name as it is; the
// next repair run may then rewrite it.
//
// `canonical_name` and `slug` are never touched: they are the join key and the
// public URL, and a display-name edit must not move either.
const nameBodySchema = z.union([
  z.object({ name: z.string().trim().min(1).max(200) }).strict(),
  z.object({ nameLocked: z.literal(false) }).strict(),
]);

artistsAdminRouter.patch(
  '/:id/name',
  zValidator('param', artistIdSchema, validationHook),
  zValidator('json', nameBodySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');
    const now = new Date();

    // One transaction with the row locked, so the audit's `previousName` is
    // the name this write replaced, not one a concurrent repair has since
    // rewritten.
    const outcome = await db.transaction(async (tx) => {
      const [previous] = await tx
        .select({ name: artists.name, nameLockedAt: artists.nameLockedAt })
        .from(artists)
        .where(eq(artists.id, id))
        .for('update');
      if (!previous) return null;

      // Releasing a lock that is not there changes nothing, so it is neither
      // written nor audited.
      if (!('name' in body) && previous.nameLockedAt === null) {
        const [row] = await tx.select().from(artists).where(eq(artists.id, id));
        return row ? { previous, updated: row, changed: false } : null;
      }

      const [row] = await tx
        .update(artists)
        .set(
          'name' in body
            ? { name: body.name, nameLockedAt: now, updatedAt: now }
            : { nameLockedAt: null, updatedAt: now },
        )
        .where(eq(artists.id, id))
        .returning();
      return row ? { previous, updated: row, changed: true } : null;
    });

    if (!outcome) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404);
    }
    const { previous, updated, changed } = outcome;

    if (changed) {
      const actor = getAuthUser(ctx);
      ctx.set(
        'auditAction',
        'name' in body ? 'artist.name.update' : 'artist.name.unlock',
      );
      ctx.set('auditTargetId', id);
      ctx.set('auditActorId', actor.userId);
      ctx.set('auditMeta', {
        slug: updated.slug,
        previousName: previous.name,
        name: updated.name,
      });
    }

    return ctx.json({ success: true, data: updated });
  },
);
