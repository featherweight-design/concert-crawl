// apps/api/src/routes/admin/artists.ts
//
// Admin review surface for the Spotify identity match (#1115, plan PR-C
// Task 9). `ambiguous` is a human queue, not an error: more than one Spotify
// artist matched the canonical name exactly, and guessing would put the wrong
// press photo on a public page. An admin resolves it by picking from the
// candidates the matcher saw, or by pasting a Spotify artist id by hand.
import { Hono } from 'hono'
import { createLogger } from '@concert-crawl/logger'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, asc, desc, eq, ilike, isNull, sql } from 'drizzle-orm'
import { artists, db, type SpotifyCandidateSnapshot } from '@concert-crawl/db'
import { canonicalizeArtist } from '@concert-crawl/crawler-core/canonical'
import { getAuthUser } from '../../middleware/auth.js'
import { httpUrl } from '../../lib/url-schema.js'
import {
  dedupeCandidates,
  toCandidateSnapshot,
} from '../../lib/artist-match.js'
import {
  createSpotifyAppClient,
  type SpotifyAppClient,
} from '../../lib/spotify-app-client.js'
import { SpotifyAuthError, SpotifyRateLimitError } from '../../lib/spotify.js'
import type { AdminVariables } from './index.js'

const logger = createLogger('admin:artists')

const matchStatusSchema = z.enum([
  'unmatched',
  'matched',
  'ambiguous',
  'no_match',
])

const listQuerySchema = z.object({
  status: matchStatusSchema.optional(),
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
})

const artistIdSchema = z.object({ id: z.string().uuid() })

const patchBodySchema = z
  .object({
    spotifyArtistId: z.union([z.string().trim().min(1).max(64), z.null()]),
    matchStatus: matchStatusSchema.optional(),
    photoUrl: z.union([httpUrl(), z.null()]).optional(),
  })
  .strict()

export const artistsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/artists?status=ambiguous&search=&limit=100
artistsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { status, search, limit } = ctx.req.valid('query')

    const filters = [
      status ? eq(artists.matchStatus, status) : undefined,
      search ? ilike(artists.canonicalName, `%${search}%`) : undefined,
    ].filter((filter) => filter !== undefined)

    const rows = await db
      .select()
      .from(artists)
      .where(filters.length > 0 ? and(...filters) : undefined)
      // Alphabetical: the queue is small and a stable, scannable order beats a
      // recency order an admin can't predict.
      .orderBy(asc(artists.name))
      .limit(limit)

    return ctx.json({ success: true, data: rows })
  },
)

// GET /v1/admin/artists/counts — queue sizes per match status.
artistsAdminRouter.get('/counts', async (ctx) => {
  const rows = await db
    .select({
      matchStatus: artists.matchStatus,
      total: sql<number>`count(*)::int`,
    })
    .from(artists)
    .groupBy(artists.matchStatus)
    .orderBy(desc(sql`count(*)`))

  const counts = { unmatched: 0, matched: 0, ambiguous: 0, no_match: 0 }
  for (const row of rows) counts[row.matchStatus] = row.total

  return ctx.json({ success: true, data: counts })
})

// PATCH /v1/admin/artists/:id — resolve a match by hand.
//
// Providing a spotifyArtistId promotes the row to `matched` unless an explicit
// matchStatus says otherwise. Clearing it (null) demotes to `no_match` by
// default. Either way matchConfidence is nulled: a hand-set identity carries
// no algorithmic score, and leaving 1.000 behind would misreport how the row
// was resolved.
artistsAdminRouter.patch(
  '/:id',
  zValidator('param', artistIdSchema),
  zValidator('json', patchBodySchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const body = ctx.req.valid('json')

    const nextStatus =
      body.matchStatus ??
      (body.spotifyArtistId === null ? 'no_match' : 'matched')

    if (body.spotifyArtistId === null && nextStatus === 'matched') {
      return ctx.json(
        {
          success: false,
          error: 'matchStatus "matched" requires a spotifyArtistId',
        },
        400,
      )
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
      )
    }
    if (nextStatus !== 'matched' && body.photoUrl) {
      return ctx.json(
        {
          success: false,
          error: `matchStatus "${nextStatus}" cannot carry a photoUrl`,
        },
        400,
      )
    }

    const [existing] = await db
      .select({ spotifyArtistId: artists.spotifyArtistId })
      .from(artists)
      .where(eq(artists.id, id))

    if (!existing) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    // The cached photo belongs to the Spotify identity it was fetched for, so
    // it dies whenever that identity does — whether the row is demoted or
    // repointed at a different artist. Leaving it behind is how a stranger's
    // face ends up on a public page, which is the exact failure this queue
    // exists to prevent. The job re-fetches on its next pass.
    const identityChanged = body.spotifyArtistId !== existing.spotifyArtistId
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
            : {}

    const [updated] = await db
      .update(artists)
      .set({
        spotifyArtistId: body.spotifyArtistId,
        matchStatus: nextStatus,
        matchConfidence: null,
        matchCheckedAt: new Date(),
        updatedAt: new Date(),
        ...photoFields,
      })
      .where(eq(artists.id, id))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'artist.match.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', {
      spotifyArtistId: body.spotifyArtistId,
      matchStatus: nextStatus,
    })

    return ctx.json({ success: true, data: updated })
  },
)

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
  const missing = candidates.filter((candidate) => candidate.genres === null)
  if (missing.length === 0) return null

  const client = await getClient()
  if (client === null) return null

  try {
    const detailsById = await client.fetchArtistDetails(
      missing.map((candidate) => candidate.id),
    )
    // An id Spotify did not resolve stays `null`. Defaulting it would persist
    // "Spotify lists no genres" for an artist we never actually read, and no
    // later open would ever try again.
    if (missing.every((candidate) => !detailsById.has(candidate.id))) {
      return null
    }
    return candidates.map((candidate) => {
      const detail = detailsById.get(candidate.id)
      // Rebuilt field by field rather than spread: rows snapshotted before
      // February 2026 still carry a `popularity` key in the JSONB, and a spread
      // would write it straight back out.
      return {
        id: candidate.id,
        name: candidate.name,
        imageUrl: candidate.imageUrl,
        genres: candidate.genres ?? detail?.genres ?? null,
        spotifyUrl: candidate.spotifyUrl,
      }
    })
  } catch (err) {
    logger.warn(
      { err, artistId },
      'candidate detail hydration failed — serving candidates unhydrated',
    )
    return null
  }
}

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
  zValidator('param', artistIdSchema),
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
  ),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const { query, refresh } = ctx.req.valid('query')

    const [artist] = await db
      .select({
        canonicalName: artists.canonicalName,
        spotifyCandidates: artists.spotifyCandidates,
        spotifyCandidatesFetchedAt: artists.spotifyCandidatesFetchedAt,
      })
      .from(artists)
      .where(eq(artists.id, id))

    if (!artist) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    const searchTerm = query ?? artist.canonicalName
    const cached =
      query === undefined && !refresh ? artist.spotifyCandidates : null

    // Building a client mints or refreshes an app token, so it is itself a
    // Spotify call — deferred until a path needs the network, and memoized so
    // a search plus a hydration still cost one. A fully-hydrated cache hit
    // never calls this, which is what makes the second open free.
    let clientPromise: Promise<SpotifyAppClient | null> | undefined
    const getClient = () => (clientPromise ??= createSpotifyAppClient())

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
      })

    try {
      if (cached !== null) {
        const hydrated = await hydrateCandidateDetails(getClient, cached, id)
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
                )
          await db
            .update(artists)
            .set({ spotifyCandidates: hydrated, updatedAt: new Date() })
            .where(and(eq(artists.id, id), unchanged))
        }
        return respond(hydrated ?? cached, artist.spotifyCandidatesFetchedAt)
      }

      // Null means SPOTIFY_CLIENT_ID/SECRET are unset — the dormant path the
      // whole match feature is built around. That is a configuration state,
      // not a failure of this request, so it gets its own status and message
      // rather than a generic 500. Only the live-search path can reach it: a
      // cache hit is local data, and refusing it because Spotify is
      // unreachable would make the picker useless when it is most needed.
      const client = await getClient()
      if (client === null) {
        return ctx.json(
          {
            success: false,
            error: 'Spotify app credentials are not configured',
          },
          503,
        )
      }

      const found = dedupeCandidates(await client.searchArtists(searchTerm))
      const snapshot = found.map(toCandidateSnapshot)
      const hydrated = await hydrateCandidateDetails(getClient, snapshot, id)
      const candidates = hydrated ?? snapshot

      // An overridden query answers a different question from the one the row
      // asks, so it is served but never written back.
      const fetchedAt = new Date()
      if (query === undefined) {
        await db
          .update(artists)
          .set({
            spotifyCandidates: candidates,
            spotifyCandidatesFetchedAt: fetchedAt,
            updatedAt: fetchedAt,
          })
          .where(eq(artists.id, id))
      }

      return respond(candidates, query === undefined ? fetchedAt : null)
    } catch (err) {
      logger.warn(
        { err, artistId: id, searchTerm },
        'candidate search failed against Spotify',
      )
      if (err instanceof SpotifyRateLimitError) {
        return ctx.json(
          {
            success: false,
            error:
              'Spotify is rate limiting us — cooldowns usually run for hours',
          },
          429,
        )
      }
      if (err instanceof SpotifyAuthError) {
        return ctx.json(
          { success: false, error: 'Spotify rejected our app credentials' },
          502,
        )
      }
      throw err
    }
  },
)

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
  zValidator('param', artistIdSchema),
  zValidator('json', z.object({ hidden: z.boolean() }).strict()),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const { hidden } = ctx.req.valid('json')

    const [updated] = await db
      .update(artists)
      .set({ hidden, updatedAt: new Date() })
      .where(eq(artists.id, id))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'artist.visibility.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', { hidden, slug: updated.slug })

    return ctx.json({ success: true, data: updated })
  },
)
