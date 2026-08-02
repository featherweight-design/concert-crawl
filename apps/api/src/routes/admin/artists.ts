// apps/api/src/routes/admin/artists.ts
//
// Admin review surface for the Spotify identity match (#1115, plan PR-C
// Task 9). `ambiguous` is a human queue, not an error: more than one Spotify
// artist matched the canonical name exactly, and guessing would put the wrong
// press photo on a public page. An admin resolves it by pasting the correct
// Spotify artist id.
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'
import { artists, db } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import { httpUrl } from '../../lib/url-schema.js'
import type { AdminVariables } from './index.js'

const matchStatusSchema = z.enum([
  'unmatched',
  'matched',
  'ambiguous',
  'no_match',
])

const listQuerySchema = z.object({
  status: matchStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
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

    const [updated] = await db
      .update(artists)
      .set({
        spotifyArtistId: body.spotifyArtistId,
        matchStatus: nextStatus,
        matchConfidence: null,
        matchCheckedAt: new Date(),
        updatedAt: new Date(),
        ...(body.photoUrl === undefined
          ? {}
          : {
              photoUrl: body.photoUrl,
              photoFetchedAt: body.photoUrl === null ? null : new Date(),
            }),
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
