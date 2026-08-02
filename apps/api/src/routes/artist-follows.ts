import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, artists, userArtistFollows } from '@concert-crawl/db'
import { ARTIST_SLUG_MAX_LENGTH } from '@concert-crawl/types'
import type { ArtistFollowResponse } from '@concert-crawl/types'

/**
 * Follow / unfollow an artist (#1115, PR-D).
 *
 * Following an artist is FREE for all signed-in plans (design brief §3.6),
 * exactly like Watching. Do NOT add a requireFeature() gate here; a session is
 * the only requirement.
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
artistFollowsRouter.post('/:slug/follow', slugValidator, async (ctx) => {
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
    .where(eq(artists.slug, slug))

  if (!artist) return ctx.json(notFound, 404)

  // Explicit read-before-insert. The unique index is
  // (user_id, source, spotify_artist_id) and an unmatched artist's
  // spotify_artist_id is NULL, which Postgres treats as distinct from every
  // other NULL — so ON CONFLICT would not dedupe here. The schema comment on
  // userArtistFollows says as much: manual duplicates are guarded at the API
  // layer, and this is that layer.
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
    await db.insert(userArtistFollows).values({
      userId: authInfo.userId,
      artistName: artist.name,
      canonicalName: artist.canonicalName,
      // Copied from the projection when the artist is matched, so a later
      // Spotify sync can reconcile against the same id. Null is fine.
      spotifyArtistId: artist.spotifyArtistId,
      source: 'manual',
    })
  }

  const data: ArtistFollowResponse = { following: true }
  return ctx.json({ success: true, data })
})

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

  const data: ArtistFollowResponse = { following: false }
  return ctx.json({ success: true, data })
})
