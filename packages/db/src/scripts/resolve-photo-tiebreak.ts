/**
 * Drains the `ambiguous` queue of rows where only one same-name candidate is a
 * real artist page.
 *
 * `matchArtist` used to send every multi-exact-name search to `ambiguous` with
 * no tiebreak. It now prefers the sole candidate carrying a press photo, but
 * that only changes verdicts the match job reaches *next* — the rows already
 * sitting in the queue were judged under the old rule and would stay there
 * until a human opened each one.
 *
 * They do not need to be re-searched. Every row carries the
 * `spotifyCandidates` snapshot the original search paid for, and the snapshot
 * records `imageUrl`, so the same verdict is computable offline. This applies
 * it, and spends no Spotify quota doing so.
 *
 * The rule is deliberately the matcher's, not a looser one written for a
 * backlog: exactly one exact-name candidate carries artwork. Two photographed
 * namesakes stay `ambiguous` for a human, because picking between them would
 * put a stranger's press photo on a public artist page.
 *
 * Resolution is recorded the way the admin picker and the MusicBrainz
 * disambiguator record theirs: `matchConfidence` stays null because no
 * algorithm scored this, the attempt budget is reset, and the cached photo is
 * cleared so the photo job re-fetches against the identity just settled on.
 *
 * A one-off rather than a cron. Once the backlog is drained the matcher applies
 * the rule inline and there is nothing left for this to do. Re-running is safe
 * and idempotent — a resolved row is no longer `ambiguous` and drops out of the
 * selection.
 */

import { canonicalizeArtist } from '@concert-crawl/types'
import { and, eq, isNotNull } from 'drizzle-orm'
import type { Database } from '../client.js'
import { artists } from '../schema/artists.js'

export interface PhotoTiebreakResolution {
  artistId: string
  name: string
  spotifyArtistId: string
  /** How many exact-name candidates the snapshot held, photographed or not. */
  exactCount: number
}

export interface PhotoTiebreakResult {
  /** Ambiguous rows carrying a snapshot, as of the read. */
  considered: number
  /** Rows the tiebreak settles. */
  resolved: number
  /** Rows actually written. Zero on a dry run. */
  updated: number
  /** Why a considered row was passed over, by reason. */
  skipped: Record<SkipReason, number>
  resolutions: PhotoTiebreakResolution[]
}

/**
 * `no-photographed-candidate` and `several-photographed-candidates` are the two
 * halves of the matcher's own guard. `single-exact-candidate` should be rare —
 * a row with one exact hit was never ambiguous on name grounds — so a non-zero
 * count means something else filed it here and is worth a look.
 */
type SkipReason =
  | 'no-exact-name-match'
  | 'single-exact-candidate'
  | 'no-photographed-candidate'
  | 'several-photographed-candidates'

const SAMPLE_SIZE = 25

export type PhotoTiebreakVerdict =
  | { kind: 'resolved'; spotifyArtistId: string; exactCount: number }
  | { kind: 'skipped'; reason: SkipReason }

/**
 * The decision, with no database around it.
 *
 * Kept pure and exported so the rule can be tested directly against candidate
 * shapes. It is the matcher's rule restated over a stored snapshot rather than
 * a live search result, and the two must not drift: if
 * `apps/api/src/lib/artist-match.ts` ever loosens its tiebreak, this loosens
 * with it or the backlog and the live path start disagreeing about the same
 * artist.
 */
export const photoTiebreakVerdict = (
  canonicalName: string,
  candidates: { id: string; name: string; imageUrl: string | null }[],
): PhotoTiebreakVerdict => {
  // Canonicalized rather than compared raw, for the same reason the matcher
  // does it: `canonical_name` has been through the transform and the
  // snapshot's `name` has not.
  const exact = candidates.filter(
    (candidate) => canonicalizeArtist(candidate.name) === canonicalName,
  )

  if (exact.length === 0)
    return { kind: 'skipped', reason: 'no-exact-name-match' }
  if (exact.length === 1)
    return { kind: 'skipped', reason: 'single-exact-candidate' }

  const photographed = exact.filter((candidate) => candidate.imageUrl !== null)
  if (photographed.length === 0)
    return { kind: 'skipped', reason: 'no-photographed-candidate' }
  if (photographed.length > 1)
    return { kind: 'skipped', reason: 'several-photographed-candidates' }

  return {
    kind: 'resolved',
    spotifyArtistId: photographed[0]!.id,
    exactCount: exact.length,
  }
}

export async function resolvePhotoTiebreak(
  database: Database,
  options: { dryRun: boolean; limit?: number | undefined },
): Promise<PhotoTiebreakResult> {
  const skipped: Record<SkipReason, number> = {
    'no-exact-name-match': 0,
    'single-exact-candidate': 0,
    'no-photographed-candidate': 0,
    'several-photographed-candidates': 0,
  }
  const resolutions: PhotoTiebreakResolution[] = []

  // Only rows carrying a snapshot are reachable — without one there is nothing
  // to re-judge. Ordered by canonical name so a run truncated by --limit
  // resumes predictably rather than re-walking a random slice.
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
        isNotNull(artists.spotifyCandidates),
      ),
    )
    .orderBy(artists.canonicalName)

  const rows = await (options.limit === undefined
    ? selection
    : selection.limit(options.limit))

  for (const row of rows) {
    const verdict = photoTiebreakVerdict(
      row.canonicalName,
      row.spotifyCandidates ?? [],
    )
    if (verdict.kind === 'skipped') {
      skipped[verdict.reason]++
      continue
    }

    resolutions.push({
      artistId: row.id,
      name: row.name,
      spotifyArtistId: verdict.spotifyArtistId,
      exactCount: verdict.exactCount,
    })
  }

  if (options.dryRun || resolutions.length === 0) {
    return {
      considered: rows.length,
      resolved: resolutions.length,
      updated: 0,
      skipped,
      resolutions,
    }
  }

  let updated = 0
  for (const resolution of resolutions) {
    // Guarded on `ambiguous` so a row an admin resolved while this run was
    // walking the queue keeps the human's answer.
    const written = await database
      .update(artists)
      .set({
        spotifyArtistId: resolution.spotifyArtistId,
        matchStatus: 'matched',
        matchConfidence: null,
        matchCheckedAt: new Date(),
        matchAttempts: 0,
        photoUrl: null,
        photoFetchedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(artists.id, resolution.artistId),
          eq(artists.matchStatus, 'ambiguous'),
        ),
      )
      .returning({ id: artists.id })
    updated += written.length
  }

  return {
    considered: rows.length,
    resolved: resolutions.length,
    updated,
    skipped,
    resolutions,
  }
}

export const sampleOf = (
  resolutions: PhotoTiebreakResolution[],
): PhotoTiebreakResolution[] => resolutions.slice(0, SAMPLE_SIZE)
