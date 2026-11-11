import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { artistReports, artists, db } from '@concert-crawl/db';
import {
  ARTIST_REPORT_NOTE_MAX,
  ARTIST_REPORT_REASONS,
  ARTIST_SLUG_MAX_LENGTH,
} from '@concert-crawl/types';
import type { ArtistReportSummary } from '@concert-crawl/types';
import { clerkAuth, getAuthUser, requireAuth } from '../middleware/auth.js';
import { moderateNote } from '../lib/moderate-note.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import { parseSpotifyArtistLink } from '../lib/spotify-artist-link.js';

export const artistReportsRouter = new Hono();

const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(ARTIST_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9-]+$/),
});

const reportBodySchema = z.object({
  reason: z.enum(ARTIST_REPORT_REASONS),
  // A pasted link. Blank counts as not given; anything else must parse.
  spotifyLink: z.string().max(300).optional(),
  note: z.string().max(ARTIST_REPORT_NOTE_MAX).optional(),
});

const REPORTS_PER_HOUR = 10;

function notFound(ctx: { json: (body: unknown, status: 404) => Response }) {
  return ctx.json({ success: false, error: 'Artist not found' }, 404);
}

// POST /v1/artists/:slug/reports
artistReportsRouter.post(
  '/:slug/reports',
  clerkAuth,
  requireAuth,
  zValidator('param', slugParamSchema, (result, ctx) => {
    if (!result.success) return notFound(ctx);
  }),
  zValidator('json', reportBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: z.flattenError(result.error),
        },
        422,
      );
    }
  }),
  async (ctx) => {
    const { slug } = ctx.req.valid('param');
    const body = ctx.req.valid('json');
    const { userId } = getAuthUser(ctx);

    // A hidden artist has no page, so it answers like a slug that never
    // existed (the same rule the detail route applies).
    const [artist] = await db
      .select({ id: artists.id })
      .from(artists)
      .where(and(eq(artists.slug, slug), eq(artists.hidden, false)))
      .limit(1);
    if (!artist) return notFound(ctx);

    const note = body.note?.trim() || null;
    if (note) {
      const moderated = moderateNote(note);
      if (!moderated.ok) {
        return ctx.json(
          { success: false, error: moderated.reason ?? 'Note rejected.' },
          422,
        );
      }
    }

    const link = body.spotifyLink?.trim();
    let suggestedSpotifyArtistId: string | null = null;
    if (link) {
      suggestedSpotifyArtistId = parseSpotifyArtistLink(link);
      if (!suggestedSpotifyArtistId) {
        return ctx.json(
          {
            success: false,
            error: "That isn't a Spotify artist link.",
            code: 'invalid_spotify_link',
          },
          422,
        );
      }
    }

    const { allowed, retryAfterMs } = await checkRateLimit(
      `artist-report:${userId}`,
      REPORTS_PER_HOUR,
      60 * 60 * 1000,
      // Fail open: authenticated and low-value to abuse, and the report
      // queue is read by a person either way.
      { onStoreError: 'allow', userId },
    );
    if (!allowed) {
      ctx.header('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      return ctx.json(
        { success: false, error: 'Rate limit exceeded. Try again later.' },
        429,
      );
    }

    // The partial unique index is the one-open-report rule; inserting through
    // it settles two concurrent submits without a check-then-insert race.
    const [created] = await db
      .insert(artistReports)
      .values({
        artistId: artist.id,
        reporterId: userId,
        reason: body.reason,
        suggestedSpotifyArtistId,
        note,
      })
      .onConflictDoNothing({
        target: [artistReports.artistId, artistReports.reporterId],
        where: sql`${artistReports.status} = 'open'`,
      })
      .returning({
        id: artistReports.id,
        reason: artistReports.reason,
        createdAt: artistReports.createdAt,
      });

    if (!created) {
      const existing = await loadOpenReport(artist.id, userId);
      return ctx.json(
        {
          success: false,
          error: 'You already have an open report for this artist',
          // Lets the client show Already reported instead of the raw message.
          code: 'report_exists',
          data: existing,
        },
        409,
      );
    }

    const data: ArtistReportSummary = {
      id: created.id,
      reason: created.reason,
      createdAt: created.createdAt.toISOString(),
    };
    return ctx.json({ success: true, data }, 201);
  },
);

// DELETE /v1/artists/:slug/reports/mine: withdraw the caller's open report.
artistReportsRouter.delete(
  '/:slug/reports/mine',
  clerkAuth,
  requireAuth,
  zValidator('param', slugParamSchema, (result, ctx) => {
    if (!result.success) return notFound(ctx);
  }),
  async (ctx) => {
    const { slug } = ctx.req.valid('param');
    const { userId } = getAuthUser(ctx);

    // Not filtered on `hidden`: a fan can always take back their own report.
    const [artist] = await db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);
    if (!artist) return notFound(ctx);

    const withdrawn = await db
      .update(artistReports)
      .set({ status: 'withdrawn', resolvedAt: new Date() })
      .where(
        and(
          eq(artistReports.artistId, artist.id),
          eq(artistReports.reporterId, userId),
          eq(artistReports.status, 'open'),
        ),
      )
      .returning({ id: artistReports.id });

    if (withdrawn.length === 0) {
      return ctx.json(
        { success: false, error: 'No open report to withdraw' },
        404,
      );
    }
    return ctx.body(null, 204);
  },
);

/** The viewer's open report on an artist, or null. Shared with the detail route. */
export async function loadOpenReport(
  artistId: string,
  reporterId: string,
): Promise<ArtistReportSummary | null> {
  const [row] = await db
    .select({
      id: artistReports.id,
      reason: artistReports.reason,
      createdAt: artistReports.createdAt,
    })
    .from(artistReports)
    .where(
      and(
        eq(artistReports.artistId, artistId),
        eq(artistReports.reporterId, reporterId),
        eq(artistReports.status, 'open'),
      ),
    )
    .limit(1);
  return row
    ? {
        id: row.id,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
      }
    : null;
}
