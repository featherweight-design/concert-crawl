// The evidence behind the joined-name ruling (see lib/joined-names.ts), wired to
// the real sources for the artist repair pass: our own `artists` table and
// MusicBrainz. Kept apart from the pure ladder so the ladder never touches a
// database or the network.

import { and, eq, isNull } from 'drizzle-orm';
import { artists, db } from '@concert-crawl/db';
import { canonicalizeArtist } from '@concert-crawl/types';
import type { JoinedEvidence } from './lib/joined-names.js';
import { makeMusicBrainzLookup } from './lib/musicbrainz.js';

/**
 * A name one of our artists answers to with an EXACT Spotify match (or a human
 * pick). A best-effort auto-match is not exact, so it is no evidence. Never asked
 * about a joined name: the canonical form of "A & B" is just "a", which would
 * answer for the wrong artist.
 */
const ourArtistKnows = async (name: string): Promise<boolean> => {
  const canonical = canonicalizeArtist(name);
  if (canonical === '') return false;
  const [row] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(
      and(
        eq(artists.canonicalName, canonical),
        eq(artists.matchStatus, 'matched'),
        isNull(artists.autoMatchedAt),
        eq(artists.hidden, false),
      ),
    )
    .limit(1);
  return row !== undefined;
};

export function makeJoinedEvidence(
  mbHasArtist: (name: string) => Promise<boolean> = makeMusicBrainzLookup(),
): JoinedEvidence {
  const ours = new Map<string, boolean>();
  return {
    whole: (name) => mbHasArtist(name),
    part: async (name) => {
      const key = name.trim().toLowerCase();
      let known = ours.get(key);
      if (known === undefined) {
        known = await ourArtistKnows(name);
        ours.set(key, known);
      }
      return known || (await mbHasArtist(name));
    },
  };
}
