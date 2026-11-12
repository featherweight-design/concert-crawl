// Needs you answers: artist matches and reports. See answer-kit.ts for the handler shape.

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { artistReports, artists, db } from '@concert-crawl/db';
import type { NeedsYouItem } from '@concert-crawl/types';
import { idSchema } from '../../../../lib/id-schema.js';
import { applyArtistMatch, matchStatusSchema } from '../artist-match-update.js';
import { dismissArtistReports } from '../artist-report-dismiss.js';
import {
  type AnswerResult,
  define,
  fail,
  noParams,
  isoOrNull,
  STATE_CHANGED,
} from './answer-kit.js';

const artistIdOf = (item: NeedsYouItem): string | null =>
  item.kind === 'artist' ? item.artistId : null;

// The match status the admin was shown when they decided. The item carries it
// (it is also part of the item's key), and every write sends it back so a row
// that changed between the queue load and the click is refused with a 409
// rather than overwritten.
const shownStatusOf = (item: NeedsYouItem) =>
  item.kind === 'artist'
    ? matchStatusSchema.safeParse(item.matchStatus).data
    : undefined;

const matchFailure = (
  outcome: Awaited<ReturnType<typeof applyArtistMatch>>,
): AnswerResult | null =>
  outcome.ok ? null : fail(outcome.status, outcome.error);

export const pickRightArtist = define({
  slug: 'pick_the_right_artist',
  kinds: ['artist'],
  schema: z.object({ spotifyArtistId: z.string().trim().min(1).max(64) }),
  run: async (item, params, actorId) => {
    const artistId = artistIdOf(item);
    if (artistId === null) return fail(400, 'Not an artist item');
    const outcome = await applyArtistMatch(
      artistId,
      {
        spotifyArtistId: params.spotifyArtistId,
        matchStatus: 'matched',
        expectedStatus: shownStatusOf(item),
      },
      actorId,
    );
    return (
      matchFailure(outcome) ?? {
        ok: true,
        params: { spotifyArtistId: params.spotifyArtistId },
        before: null,
      }
    );
  },
});

export const noPhoto = define({
  slug: 'no_photo',
  kinds: ['artist'],
  schema: noParams,
  run: async (item, _params, actorId) => {
    const artistId = artistIdOf(item);
    if (artistId === null) return fail(400, 'Not an artist item');
    const outcome = await applyArtistMatch(
      artistId,
      {
        spotifyArtistId: null,
        matchStatus: 'no_match',
        expectedStatus: shownStatusOf(item),
      },
      actorId,
    );
    return matchFailure(outcome) ?? { ok: true, params: {}, before: null };
  },
});

const keepSnapshot = z.discriminatedUnion('path', [
  z.object({
    path: z.literal('confirm'),
    artistId: idSchema,
    spotifyArtistId: z.string(),
    matchStatus: z.enum([
      'unmatched',
      'matched',
      'ambiguous',
      'no_match',
      'not_an_artist',
    ]),
    matchAttempts: z.number().int(),
    matchConfidence: z.string().nullable(),
    autoMatchedAt: z.string().datetime({ offset: true }),
    matchCheckedAt: isoOrNull,
    closedReportIds: z.array(idSchema),
    // What the answer itself wrote, so an undo can tell a later change apart.
    answered: z.object({ matchCheckedAt: isoOrNull }),
  }),
  z.object({
    path: z.literal('dismiss'),
    artistId: idSchema,
    closedReportIds: z.array(idSchema),
  }),
]);

/**
 * Put dismissed reports back to open, skipping a reporter who has filed a new
 * open one meanwhile (one open report per fan per artist). Returns the ids
 * reopened.
 */
const reopenReports = async (
  artistId: string,
  reportIds: string[],
): Promise<string[]> => {
  if (reportIds.length === 0) return [];
  return db.transaction(async (tx) => {
    const closed = await tx
      .select({ id: artistReports.id, reporterId: artistReports.reporterId })
      .from(artistReports)
      .where(
        and(
          inArray(artistReports.id, reportIds),
          eq(artistReports.status, 'dismissed'),
        ),
      );
    const open = await tx
      .select({ reporterId: artistReports.reporterId })
      .from(artistReports)
      .where(
        and(
          eq(artistReports.artistId, artistId),
          eq(artistReports.status, 'open'),
        ),
      );
    const busy = new Set(open.map((row) => row.reporterId));
    const reopen = closed
      .filter((row) => !busy.has(row.reporterId))
      .map((row) => row.id);
    if (reopen.length === 0) return [];
    await tx
      .update(artistReports)
      .set({ status: 'open', resolvedAt: null, resolvedBy: null })
      .where(inArray(artistReports.id, reopen));
    return reopen;
  });
};

export const keepThisMatch = define({
  slug: 'keep_this_match',
  kinds: ['artist'],
  schema: noParams,
  run: async (item, _params, actorId) => {
    const artistId = artistIdOf(item);
    if (artistId === null) return fail(400, 'Not an artist item');
    const [artist] = await db
      .select({
        spotifyArtistId: artists.spotifyArtistId,
        matchStatus: artists.matchStatus,
        matchAttempts: artists.matchAttempts,
        matchConfidence: artists.matchConfidence,
        autoMatchedAt: artists.autoMatchedAt,
        matchCheckedAt: artists.matchCheckedAt,
      })
      .from(artists)
      .where(eq(artists.id, artistId));
    if (!artist) return fail(404, 'Artist not found');
    // The row moved on since the queue showed it: neither confirming nor
    // dismissing reports is the answer to the question that was asked.
    if (artist.matchStatus !== shownStatusOf(item)) {
      return fail(409, STATE_CHANGED);
    }

    // An unconfirmed auto-match is confirmed; otherwise the answer says the
    // page is right as it is, which dismisses its open reports.
    if (artist.autoMatchedAt !== null && artist.spotifyArtistId !== null) {
      const open = await db
        .select({ id: artistReports.id })
        .from(artistReports)
        .where(
          and(
            eq(artistReports.artistId, artistId),
            eq(artistReports.status, 'open'),
          ),
        );
      const outcome = await applyArtistMatch(
        artistId,
        {
          spotifyArtistId: artist.spotifyArtistId,
          confirmAutoMatch: true,
          expectedStatus: shownStatusOf(item),
        },
        actorId,
      );
      if (!outcome.ok) return fail(outcome.status, outcome.error);
      return {
        ok: true,
        params: {},
        before: {
          path: 'confirm',
          artistId,
          spotifyArtistId: artist.spotifyArtistId,
          matchStatus: artist.matchStatus,
          matchAttempts: artist.matchAttempts,
          matchConfidence: artist.matchConfidence,
          autoMatchedAt: artist.autoMatchedAt.toISOString(),
          matchCheckedAt: artist.matchCheckedAt?.toISOString() ?? null,
          closedReportIds: open.map((row) => row.id),
          answered: {
            matchCheckedAt:
              outcome.artist.matchCheckedAt?.toISOString() ?? null,
          },
        },
      };
    }

    const dismissed = await dismissArtistReports(artistId, actorId);
    if (!dismissed) return fail(404, 'Artist not found');
    if (dismissed.closedIds.length === 0) {
      return fail(422, 'There is no match to keep and no report to dismiss');
    }
    return {
      ok: true,
      params: {},
      before: {
        path: 'dismiss',
        artistId,
        closedReportIds: dismissed.closedIds,
      },
    };
  },
  undo: {
    schema: keepSnapshot,
    run: async (before) => {
      if (before.path === 'dismiss') {
        const stillDismissed = await db
          .select({ id: artistReports.id })
          .from(artistReports)
          .where(
            and(
              inArray(artistReports.id, before.closedReportIds),
              eq(artistReports.status, 'dismissed'),
            ),
          );
        if (stillDismissed.length !== before.closedReportIds.length) {
          return fail(409, STATE_CHANGED);
        }
        const reopened = await reopenReports(
          before.artistId,
          before.closedReportIds,
        );
        return {
          ok: true,
          restored: { artistId: before.artistId, reopenedReportIds: reopened },
        };
      }

      // Only while the row is exactly as the answer left it.
      const restoredRows = await db
        .update(artists)
        .set({
          matchStatus: before.matchStatus,
          matchAttempts: before.matchAttempts,
          matchConfidence: before.matchConfidence,
          autoMatchedAt: new Date(before.autoMatchedAt),
          matchCheckedAt:
            before.matchCheckedAt === null
              ? null
              : new Date(before.matchCheckedAt),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(artists.id, before.artistId),
            eq(artists.spotifyArtistId, before.spotifyArtistId),
            eq(artists.matchStatus, 'matched'),
            artistAnsweredAt(before.answered.matchCheckedAt),
          ),
        )
        .returning({ id: artists.id });
      if (restoredRows.length === 0) return fail(409, STATE_CHANGED);
      const reopened = await reopenReports(
        before.artistId,
        before.closedReportIds,
      );
      return {
        ok: true,
        restored: { artistId: before.artistId, reopenedReportIds: reopened },
      };
    },
  },
});

function artistAnsweredAt(matchCheckedAt: string | null) {
  return matchCheckedAt === null
    ? isNull(artists.autoMatchedAt)
    : and(
        eq(artists.matchCheckedAt, new Date(matchCheckedAt)),
        isNull(artists.autoMatchedAt),
      );
}
