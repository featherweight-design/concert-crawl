import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db, artists, userArtistFollows } from '@concert-crawl/db'
import { requireFeature } from '../middleware/entitlement.js'
import {
  ARTIST_SLUG_MAX_LENGTH,
  BULK_FOLLOW_MAX_SLUGS,
} from '@concert-crawl/types'
import type {
  ArtistFollowResponse,
  BulkFollowResponse,
  BulkFollowResult,
  FollowedArtist,
} from '@concert-crawl/types'
import { loadNextShowByCanonical } from '../lib/artist-follows.js'

/**
 * Follow / unfollow an artist (#1115, PR-D).
 *
 * Following is a PREMIUM feature. The entitlements matrix has always said so
 * (`following` is paywall-on-tap for free/supporter); this router shipped
 * ungated on the strength of design brief #1115 §3.6, which Hugh retired on
 * 2026-08-04. POST carries requireFeature('following'); free and supporter get
 * a 403 the client turns into the paywall.
 *
 * DELETE is deliberately NOT gated. A user who downgrades must still be able
 * to unfollow, or they are stranded with rows they cannot remove.
 *
 * This router writes `user_artist_follows` and NOTHING else. It must never
 * call the Spotify API: the button does not follow the artist on the user's
 * Spotify account (brief §3.5). A regression test asserts zero Spotify calls.
 */
export const artistFollowsRouter = new Hono()

artistFollowsRouter.use('*', clerkMiddleware())

const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(ARTIST_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9-]+$/),
})

const notFound = { success: false, error: 'Artist not found' } as const
const unauthorized = { success: false, error: 'Unauthorized' } as const

const slugValidator = zValidator('param', slugParamSchema, (result, ctx) => {
  if (!result.success) return ctx.json(notFound, 404)
})

// POST /v1/artists/:slug/follow
artistFollowsRouter.post(
  '/:slug/follow',
  slugValidator,
  requireFeature('following'),
  async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) return ctx.json(unauthorized, 401)

    const { slug } = ctx.req.valid('param')

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
      .where(and(eq(artists.slug, slug), eq(artists.hidden, false)))

    if (!artist) return ctx.json(notFound, 404)

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
      .limit(1)

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
        .onConflictDoNothing()
    }

    const data: ArtistFollowResponse = { following: true }
    return ctx.json({ success: true, data })
  },
)

// DELETE /v1/artists/:slug/follow
artistFollowsRouter.delete('/:slug/follow', slugValidator, async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId) return ctx.json(unauthorized, 401)

  const { slug } = ctx.req.valid('param')

  const [artist] = await db
    .select({ canonicalName: artists.canonicalName })
    .from(artists)
    .where(eq(artists.slug, slug))

  if (!artist) return ctx.json(notFound, 404)

  // Scoped to source='manual' on purpose. A Spotify-sourced row is owned by
  // the sync job — deleting it here would resurrect on the next sync and, in
  // the meantime, silently diverge from the user's Spotify account.
  await db
    .delete(userArtistFollows)
    .where(
      and(
        eq(userArtistFollows.userId, authInfo.userId),
        eq(userArtistFollows.canonicalName, artist.canonicalName),
        eq(userArtistFollows.source, 'manual'),
      ),
    )

  // Report the effective state, not the intent. GET /v1/artists/:slug counts a
  // follow from ANY source, so a synced user still reads as following after
  // their manual row goes — answering a flat `false` here would contradict the
  // very next read and flicker the button back on.
  const [remaining] = await db
    .select({ id: userArtistFollows.id })
    .from(userArtistFollows)
    .where(
      and(
        eq(userArtistFollows.userId, authInfo.userId),
        eq(userArtistFollows.canonicalName, artist.canonicalName),
      ),
    )
    .limit(1)

  const data: ArtistFollowResponse = { following: Boolean(remaining) }
  return ctx.json({ success: true, data })
})

/**
 * Viewer-scoped follow collection, mounted at `/v1/me` (native following eng
 * spec §7.5, §9.3). Separate router from the `/v1/artists`-mounted one above
 * purely because the mount point differs; the semantics are the same table.
 */
export const meArtistFollowsRouter = new Hono()

meArtistFollowsRouter.use('*', clerkMiddleware())

/**
 * GET /v1/me/artist-follows — the viewer's follows, newest first, each with
 * the artist's next Denver date (nullable) and the row's `source`.
 *
 * ⚠️ DELIBERATELY NOT `requireFeature('following')`-gated, for the same reason
 * the DELETE above is not: a user who downgrades must still be able to SEE and
 * MANAGE the list they already built. Gating this endpoint would strand them
 * with rows they cannot read or remove. This is not an oversight — do not
 * "fix" it by adding the middleware.
 *
 * A null `nextShow` is a normal, common case ("played Denver before, nothing
 * upcoming"), not an error.
 */
meArtistFollowsRouter.get('/artist-follows', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId) return ctx.json(unauthorized, 401)

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
    )

  if (followRows.length === 0) {
    return ctx.json({ success: true, data: [] })
  }

  const canonicalNames = [
    ...new Set(followRows.map((row) => row.canonicalName)),
  ]

  // Two supporting reads, both keyed on the canonical name: the projection row
  // (for the page link and the photo) and the next date.
  const [projectionRows, nextShows] = await Promise.all([
    db
      .select({
        canonicalName: artists.canonicalName,
        slug: artists.slug,
        photoUrl: artists.photoUrl,
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
  ])

  const projectionByCanonical = new Map(
    projectionRows.map((row) => [row.canonicalName, row]),
  )

  const data: FollowedArtist[] = followRows.map((row) => {
    const projection = projectionByCanonical.get(row.canonicalName)
    return {
      name: row.artistName,
      slug: projection?.slug ?? null,
      canonicalName: row.canonicalName,
      photoUrl: projection?.photoUrl ?? null,
      source: row.source,
      followedAt: row.createdAt.toISOString(),
      nextShow: nextShows.get(row.canonicalName) ?? null,
    }
  })

  return ctx.json({ success: true, data })
})

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
})

/**
 * POST /v1/me/artist-follows/bulk — commit a whole selection in one write
 * (§9.3). `requireFeature('following')` gated: free/supporter select freely in
 * the UI, and only the commit is paywalled, so the 403 here is the moment the
 * paywall opens.
 *
 * Returns a PER-SLUG result so a partial failure is visible rather than
 * swallowed, and is idempotent: a slug the user already follows comes back
 * `already_following`, which is a success. Re-committing a selection that half
 * landed is therefore safe.
 */
meArtistFollowsRouter.post(
  '/artist-follows/bulk',
  zValidator('json', bulkFollowSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid slug list' }, 400)
    }
  }),
  requireFeature('following'),
  async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) return ctx.json(unauthorized, 401)

    const { slugs } = ctx.req.valid('json')
    // A duplicated slug in the body is the caller's bug, not a conflict — dedupe
    // and answer once per distinct slug, preserving first-seen order.
    const requestedSlugs = [...new Set(slugs)]

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
      )

    const artistBySlug = new Map(artistRows.map((row) => [row.slug, row]))

    const existingRows =
      artistRows.length === 0
        ? []
        : await db
            .select({ canonicalName: userArtistFollows.canonicalName })
            .from(userArtistFollows)
            .where(
              and(
                eq(userArtistFollows.userId, authInfo.userId),
                eq(userArtistFollows.source, 'manual'),
                inArray(
                  userArtistFollows.canonicalName,
                  artistRows.map((row) => row.canonicalName),
                ),
              ),
            )

    const alreadyFollowing = new Set(
      existingRows.map((row) => row.canonicalName),
    )

    const toInsert: Array<typeof userArtistFollows.$inferInsert> = []
    const results: BulkFollowResult[] = requestedSlugs.map((slug) => {
      const artist = artistBySlug.get(slug)
      if (!artist) return { slug, status: 'artist_not_found' }
      if (alreadyFollowing.has(artist.canonicalName)) {
        return { slug, status: 'already_following' }
      }
      // Two slugs can canonicalize to the same artist; treat the second as
      // already-following so the insert set stays unique.
      alreadyFollowing.add(artist.canonicalName)
      toInsert.push({
        userId: authInfo.userId,
        artistName: artist.name,
        canonicalName: artist.canonicalName,
        spotifyArtistId: artist.spotifyArtistId,
        source: 'manual',
      })
      return { slug, status: 'followed' }
    })

    if (toInsert.length > 0) {
      // Untargeted on purpose, matching the single POST: it covers whichever
      // unique index a concurrent double-commit trips, so neither request 500s.
      await db.insert(userArtistFollows).values(toInsert).onConflictDoNothing()
    }

    const data: BulkFollowResponse = {
      results,
      followedCount: toInsert.length,
    }
    return ctx.json({ success: true, data })
  },
)
