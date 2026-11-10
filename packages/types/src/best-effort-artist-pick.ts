import { normalizeArtistName } from './canonical-artist.js';

/** The fields of a Spotify candidate snapshot the rule reads. */
export interface BestEffortCandidate {
  id: string;
  name: string;
  imageUrl: string | null;
}

export type BestEffortDecline =
  'no-snapshot' | 'top-not-exact' | 'top-no-photo' | 'not-a-whole-act';

export type BestEffortPick<C extends BestEffortCandidate> =
  { picked: C } | { declined: BestEffortDecline };

/**
 * The best-effort answer for an artist the matcher left ambiguous (Hugh,
 * 2026-11-10: a wrong artist is easier to fix than an unmatched one).
 *
 * Takes Spotify's own top result when it is plainly the act: it folds to the
 * row's canonical name, it has a photo, and the row names one whole act rather
 * than an event title cut at a separator (`Beacons & Brews` is canonical
 * `beacons`). Spotify ranks by relevance, which weighs popularity; with
 * popularity gone from the API, that order is the only popularity signal left.
 *
 * Deliberately the TOP result only. The first exact-name candidate anywhere
 * in the list would clear more rows, but for `pearl` it is a namesake Spotify
 * ranked below Pearl Jam, and nothing says that one is playing Denver.
 *
 * Pure, so the match job and the backlog script decide identically. Plan:
 * docs/superpowers/plans/2026-11-10-ambiguous-artist-auto-match.md.
 */
export function pickBestEffortCandidate<C extends BestEffortCandidate>(
  candidates: readonly C[] | null,
  row: { name: string; canonicalName: string },
): BestEffortPick<C> {
  const top = candidates?.[0];
  if (top === undefined) return { declined: 'no-snapshot' };
  if (normalizeArtistName(row.name).trim() !== row.canonicalName) {
    return { declined: 'not-a-whole-act' };
  }
  // The whole name, folded but never cut at a separator: `Pearl & The
  // Oysters` is a different act from `Pearl`.
  if (normalizeArtistName(top.name).trim() !== row.canonicalName) {
    return { declined: 'top-not-exact' };
  }
  if (top.imageUrl === null || top.imageUrl === '') {
    return { declined: 'top-no-photo' };
  }
  return { picked: top };
}
