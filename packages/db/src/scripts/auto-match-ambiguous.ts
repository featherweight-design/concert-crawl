/**
 * One-off backlog pass: applies the best-effort pick to every artist the
 * matcher left `ambiguous`. Plan:
 * docs/superpowers/plans/2026-11-10-ambiguous-artist-auto-match.md.
 *
 * Reads only the stored `spotifyCandidates` snapshot, so it makes no Spotify
 * call and costs nothing. Exhausted rows are in scope: the MusicBrainz verdict
 * that exhausted them says the name is shared, not that Spotify's top hit is
 * wrong, and the ruling accepts that risk because the pick is marked.
 *
 * A pick writes what the match job writes for one (the chosen act's photo,
 * `autoMatchedAt`), and one `audit_log` row per artist so a bad pick can be
 * traced to the pass that made it. The write is guarded on the row still being
 * `ambiguous`, so a human answer given mid-run wins, and a re-run is a no-op.
 */

import { and, eq, isNotNull } from 'drizzle-orm';
import {
  pickBestEffortCandidate,
  type BestEffortDecline,
} from '@concert-crawl/types';
import { artists } from '../schema/artists.js';
import { auditLog } from '../schema/users.js';
import type { Database } from '../client.js';

/** The `audit_log.actor_id` for writes this pass makes; no admin is behind them. */
export const AUTO_MATCH_ACTOR = 'system:auto-match';
export const AUTO_MATCH_AUDIT_ACTION = 'artist.match.auto';

export interface AutoMatchResult {
  considered: number;
  picked: number;
  /** Rows actually written. Zero on a dry run. */
  updated: number;
  declined: Record<BestEffortDecline, number>;
  picks: {
    artistId: string;
    name: string;
    spotifyArtistId: string;
    spotifyName: string;
    photoUrl: string | null;
  }[];
}

export async function autoMatchAmbiguousArtists(
  database: Database,
  options: { dryRun: boolean; limit?: number | undefined },
): Promise<AutoMatchResult> {
  const selection = database
    .select({
      id: artists.id,
      name: artists.name,
      canonicalName: artists.canonicalName,
      spotifyCandidates: artists.spotifyCandidates,
    })
    .from(artists)
    .where(
      and(
        eq(artists.matchStatus, 'ambiguous'),
        eq(artists.hidden, false),
        isNotNull(artists.spotifyCandidates),
      ),
    )
    .orderBy(artists.canonicalName);
  const rows = await (options.limit === undefined
    ? selection
    : selection.limit(options.limit));

  const declined: Record<BestEffortDecline, number> = {
    'no-snapshot': 0,
    'top-not-exact': 0,
    'top-no-photo': 0,
    'not-a-whole-act': 0,
  };
  const picks: AutoMatchResult['picks'] = [];
  for (const row of rows) {
    const verdict = pickBestEffortCandidate(row.spotifyCandidates, row);
    if ('declined' in verdict) {
      declined[verdict.declined] += 1;
      continue;
    }
    picks.push({
      artistId: row.id,
      name: row.name,
      spotifyArtistId: verdict.picked.id,
      spotifyName: verdict.picked.name,
      photoUrl: verdict.picked.imageUrl,
    });
  }

  let updated = 0;
  if (!options.dryRun) {
    for (const pick of picks) {
      const now = new Date();
      const written = await database.transaction(async (tx) => {
        const rowsWritten = await tx
          .update(artists)
          .set({
            spotifyArtistId: pick.spotifyArtistId,
            matchStatus: 'matched',
            matchConfidence: null,
            matchCheckedAt: now,
            matchAttempts: 0,
            // The pick always has a photo; nothing else would fetch one for a
            // matched row with none.
            photoUrl: pick.photoUrl,
            photoFetchedAt: now,
            autoMatchedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(artists.id, pick.artistId),
              eq(artists.matchStatus, 'ambiguous'),
            ),
          )
          .returning({ id: artists.id });
        if (rowsWritten.length > 0) {
          await tx.insert(auditLog).values({
            actorId: AUTO_MATCH_ACTOR,
            action: AUTO_MATCH_AUDIT_ACTION,
            targetId: pick.artistId,
            metadata: {
              spotifyArtistId: pick.spotifyArtistId,
              rule: 'top-exact-with-photo',
            },
          });
        }
        return rowsWritten.length;
      });
      updated += written;
    }
  }

  return {
    considered: rows.length,
    picked: picks.length,
    updated,
    declined,
    picks,
  };
}
