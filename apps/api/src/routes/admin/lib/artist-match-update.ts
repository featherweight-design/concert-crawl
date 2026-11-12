import { and, eq, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { artists, db } from '@concert-crawl/db';
import { closeOpenArtistReports } from '../../../lib/artist-reports.js';
import { httpUrl } from '../../../lib/url-schema.js';

export const matchStatusSchema = z.enum([
  'unmatched',
  'matched',
  'ambiguous',
  'no_match',
  'not_an_artist',
]);

export const artistMatchBodySchema = z
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

export type ArtistMatchBody = z.infer<typeof artistMatchBodySchema>;

export type ApplyArtistMatchResult =
  | {
      ok: true;
      artist: typeof artists.$inferSelect;
      nextStatus: z.infer<typeof matchStatusSchema>;
      previousAutoMatchedAt: Date | null;
      // True when "It's an artist" lifted the not-an-artist hide, so the audit
      // records the visibility change as well as the match.
      unhid: boolean;
    }
  | { ok: false; status: 400 | 404 | 409; error: string };

/**
 * Resolve an artist's Spotify match by hand (PATCH /v1/admin/artists/:id), with
 * the fix and the closing of its open reports committing together.
 */
export const applyArtistMatch = async (
  id: string,
  body: ArtistMatchBody,
  actorId: string,
): Promise<ApplyArtistMatchResult> => {
  const nextStatus =
    body.matchStatus ??
    (body.spotifyArtistId === null ? 'no_match' : 'matched');

  if (body.spotifyArtistId === null && nextStatus === 'matched') {
    return {
      ok: false,
      status: 400,
      error: 'matchStatus "matched" requires a spotifyArtistId',
    };
  }

  // An identity and a photo only mean anything on a matched row. Rather than
  // let a client write `ambiguous` alongside a live spotifyArtistId — a state
  // the job and the artist page would both read as matched — reject it.
  if (nextStatus !== 'matched' && body.spotifyArtistId !== null) {
    return {
      ok: false,
      status: 400,
      error: `matchStatus "${nextStatus}" requires spotifyArtistId to be null`,
    };
  }
  if (nextStatus !== 'matched' && body.photoUrl) {
    return {
      ok: false,
      status: 400,
      error: `matchStatus "${nextStatus}" cannot carry a photoUrl`,
    };
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
    return { ok: false, status: 404, error: 'Artist not found' };
  }
  if (
    body.confirmAutoMatch === true &&
    (existing.autoMatchedAt === null ||
      existing.spotifyArtistId !== body.spotifyArtistId)
  ) {
    return {
      ok: false,
      status: 409,
      error: 'The auto-match has changed since it was loaded',
    };
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

  // The fix and the closing of its reports commit together. Only a write
  // that changed what the page shows is a fix. "Looks right" on an
  // auto-match, or a save that repeats the current answer, says the page was
  // right all along, so it dismisses instead: no notification.
  const unhide =
    existing.matchStatus === 'not_an_artist' && nextStatus === 'unmatched';
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
        // The one exception is that action: "It's an artist" on the Not artists
        // tab (admin redesign 4c) sends the row back to To check as
        // `unmatched`, and undoes the hide the verdict set in the same write,
        // so the row is never half-restored.
        ...(nextStatus === 'not_an_artist'
          ? { hidden: true }
          : unhide
            ? { hidden: false }
            : {}),
      })
      // A confirm re-checks at the write, not just at the read above: the
      // match job can repoint the row in between. So does the un-hide: if
      // another admin re-ruled the row meanwhile, its hide is no longer the
      // verdict's to lift.
      .where(
        body.confirmAutoMatch === true
          ? and(
              eq(artists.id, id),
              isNotNull(artists.autoMatchedAt),
              eq(artists.spotifyArtistId, body.spotifyArtistId ?? ''),
            )
          : unhide
            ? and(eq(artists.id, id), eq(artists.matchStatus, 'not_an_artist'))
            : eq(artists.id, id),
      )
      .returning();
    if (row) {
      await closeOpenArtistReports(tx, {
        artist: row,
        outcome: changedThePage ? 'fixed' : 'dismissed',
        resolvedBy: actorId,
      });
    }
    return row;
  });

  if (!updated) {
    return body.confirmAutoMatch === true
      ? {
          ok: false,
          status: 409,
          error: 'The auto-match has changed since it was loaded',
        }
      : unhide
        ? {
            ok: false,
            status: 409,
            error: 'The artist has changed since it was loaded',
          }
        : { ok: false, status: 404, error: 'Artist not found' };
  }

  return {
    ok: true,
    artist: updated,
    nextStatus,
    previousAutoMatchedAt: existing.autoMatchedAt,
    unhid: unhide,
  };
};
