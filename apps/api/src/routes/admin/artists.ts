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
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'
import { artists, db } from '@concert-crawl/db'
import { canonicalizeArtist } from '@concert-crawl/crawler-core/canonical'
import { getAuthUser } from '../../middleware/auth.js'
import { httpUrl } from '../../lib/url-schema.js'
import { createSpotifyAppClient } from '../../lib/spotify-app-client.js'
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

// GET /v1/admin/artists/:id/candidates?query= — what Spotify returns for this row.
//
// The matcher already fetched these and threw them away, keeping only its
// verdict (#1345). Re-running the search on demand is the cheapest way to get
// them back: caching them would mean a column that goes stale the moment an
// artist changes their Spotify profile, and prefetching the whole table would
// spend the app-token search quota that MATCH_BATCH_SIZE exists to ration.
// One row, one admin click, one search.
//
// `query` overrides the search term. `no_match` usually means the artist exists under a
// spelling exact matching cannot reach ("Michael Smoak" vs "Mike Smoak"), and
// without an override the endpoint would keep returning the same empty list.
//
// `isExactMatch` marks the candidates the matcher itself accepted — on an
// `ambiguous` row those are precisely the ones that collided, which is the
// question the admin is actually trying to answer.
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
    }),
  ),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const { query } = ctx.req.valid('query')

    const [artist] = await db
      .select({ canonicalName: artists.canonicalName })
      .from(artists)
      .where(eq(artists.id, id))

    if (!artist) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    const client = await createSpotifyAppClient()
    // Null means SPOTIFY_CLIENT_ID/SECRET are unset — the dormant path the
    // whole match feature is built around. That is a configuration state, not
    // a failure of this request, so it gets its own status and message rather
    // than a generic 500.
    if (client === null) {
      return ctx.json(
        {
          success: false,
          error: 'Spotify app credentials are not configured',
        },
        503,
      )
    }

    const searchTerm = query ?? artist.canonicalName

    try {
      const candidates = await client.searchArtists(searchTerm)

      // Spotify can echo one artist across a rescored result; the admin should
      // see each artist once.
      const seen = new Set<string>()
      const deduped = candidates.filter((candidate) => {
        if (seen.has(candidate.id)) return false
        seen.add(candidate.id)
        return true
      })

      // Search results always carry an empty `genres`, so the picker's
      // disambiguation line read "No genres listed" on every candidate. Genres
      // only exist on the full artist object, which is one extra call.
      // Failing to get them is not a reason to fail the search: the picker is
      // still usable on name, photo and popularity alone.
      let genresById = new Map<string, string[]>()
      try {
        genresById = await client.fetchGenres(
          deduped.map((candidate) => candidate.id),
        )
      } catch (err) {
        logger.warn(
          { err, artistId: id },
          'candidate genre hydration failed — serving candidates without genres',
        )
      }

      const data = deduped.map((candidate) => ({
        ...candidate,
        genres: genresById.get(candidate.id) ?? candidate.genres,
        isExactMatch:
          canonicalizeArtist(candidate.name) === artist.canonicalName,
      }))

      return ctx.json({ success: true, data, query: searchTerm })
    } catch (err) {
      logger.warn(
        { err, artistId: id, searchTerm },
        'candidate search failed against Spotify',
      )
      if (err instanceof SpotifyRateLimitError) {
        return ctx.json(
          {
            success: false,
            error: 'Spotify is rate limiting us — try again shortly',
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
