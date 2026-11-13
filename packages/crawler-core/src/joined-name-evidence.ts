// The evidence behind the joined-name ruling (see lib/joined-names.ts), wired to
// the real sources for the artist repair pass: our own `artists` table and
// MusicBrainz. Kept apart from the pure ladder so the ladder never touches a
// database or the network.

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { artists, db, events } from '@concert-crawl/db';
import { canonicalizeArtist } from '@concert-crawl/types';
import type { JoinedEvidence } from './lib/joined-names.js';
import {
  makeMusicBrainzLookup,
  type MusicBrainzLookup,
} from './lib/musicbrainz.js';

/**
 * A name one of our artists answers to, strongly enough to split a bill on:
 * an exact Spotify match or a human pick (a best-effort auto-match is no
 * evidence), a row created from this very name rather than from the first
 * segment of a joined string, and a night of its own, billed alone at some
 * venue. A bare word like "COUNTRY" or "The Keels" is a row some past
 * derivation made from half of a band's name, and has none of these; an
 * outside source naming it exactly proves nothing either, so parts are known
 * from our table only. Never asked about a joined name: the canonical form of
 * "A & B" is just "a", which would answer for the wrong artist.
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
        sql`lower(${artists.name}) = lower(${name.trim()})`,
        eq(artists.matchStatus, 'matched'),
        isNotNull(artists.spotifyArtistId),
        isNull(artists.autoMatchedAt),
        eq(artists.hidden, false),
        sql`exists (select 1 from ${events} where lower(${events.artist}) = lower(${name.trim()}))`,
      ),
    )
    .limit(1);
  return row !== undefined;
};

/**
 * Whole-name evidence is MusicBrainz alone (our rows hold only the first
 * segment of a joined name), and it is asked with `mb`, whose `stats` say how
 * many names it found, did not find, or could not ask.
 */
export function makeJoinedEvidence(
  mb: MusicBrainzLookup = makeMusicBrainzLookup(),
): JoinedEvidence {
  const ours = new Map<string, boolean>();
  return {
    whole: (name) => mb(name),
    part: async (name) => {
      const key = name.trim().toLowerCase();
      let known = ours.get(key);
      if (known === undefined) {
        known = await ourArtistKnows(name);
        ours.set(key, known);
      }
      return known;
    },
  };
}
