// #1115 PR-G — resolve display artist names to their `artists.slug` so the
// event-detail page can link a name to its artist page.
//
// The `artists` table is a PROJECTION (see packages/db/src/schema/artists.ts):
// a name with no row is normal, not an error, and resolves to `null` so the UI
// renders plain text instead of a dead link.
//
// Canonicalization is done here in JS, element-wise, rather than reading
// `events.canonical_supporting`: that column is written by
// `canonicalizeSupporting()`, which dedupes and sorts, so it cannot be zipped
// positionally against `events.supporting_artists`.

import { db, artists } from '@concert-crawl/db';
import { and, eq, inArray } from 'drizzle-orm';
import { canonicalizeArtist, type EventHeadliner } from '@concert-crawl/types';

export interface ResolvedArtistSlugs {
  /** The headliner's slug, or null when the projection has no row. */
  artistSlug: string | null;
  /**
   * Positionally aligned with the `supportingArtists` argument — same length,
   * same order, `null` where that name has no row. Null when the argument is
   * null (a legacy pre-recrawl event row).
   */
  supportingArtistSlugs: Array<string | null> | null;
  /**
   * Every act headlining the bill, each with its own slug (null where that
   * name has no visible row), in `events.headliners` order. A co-headline
   * night ("Clipse & J.I.D") has one display string in `artist` but two acts
   * here, so each can link to its own page. One entry per act: two spellings
   * of one act ("Clipse", "CLIPSE") keep the first. Null when the
   * `headliners` argument is null (the ladder never ran on the row); an empty
   * array when the ladder found no act.
   */
  headliners: EventHeadliner[] | null;
}

export const resolveArtistSlugs = async (
  headliner: string,
  supportingArtists: string[] | null,
  headliners: string[] | null,
): Promise<ResolvedArtistSlugs> => {
  const headlinerCanonical = canonicalizeArtist(headliner);
  const supportingCanonical = (supportingArtists ?? []).map((name) =>
    canonicalizeArtist(name),
  );
  // Each act paired with its canonical name, first spelling kept per act.
  const headlinerActs: { name: string; canonical: string }[] = [];
  for (const name of headliners ?? []) {
    const canonical = canonicalizeArtist(name);
    if (!headlinerActs.some((act) => act.canonical === canonical)) {
      headlinerActs.push({ name, canonical });
    }
  }
  const headlinersCanonical = headlinerActs.map((act) => act.canonical);

  // One lookup for every distinct non-empty canonical name on the bill.
  // canonicalizeArtist can return '' (a name that is punctuation only), which
  // matches nothing and would only bloat the IN list.
  const lookup = [
    ...new Set([
      headlinerCanonical,
      ...supportingCanonical,
      ...headlinersCanonical,
    ]),
  ]
    .filter((canonical) => canonical !== '')
    .sort();

  const rows =
    lookup.length === 0
      ? []
      : await db
          .select({
            canonicalName: artists.canonicalName,
            slug: artists.slug,
          })
          .from(artists)
          // A hidden row (#1342) resolves to null, which the caller already
          // renders as plain text — the same degradation as a name the
          // projection has no row for at all.
          .where(
            and(
              inArray(artists.canonicalName, lookup),
              eq(artists.hidden, false),
            ),
          );

  const slugByCanonical = new Map(
    rows.map((row) => [row.canonicalName, row.slug]),
  );

  return {
    artistSlug: slugByCanonical.get(headlinerCanonical) ?? null,
    supportingArtistSlugs:
      supportingArtists === null
        ? null
        : supportingCanonical.map(
            (canonical) => slugByCanonical.get(canonical) ?? null,
          ),
    headliners:
      headliners === null
        ? null
        : headlinerActs.map(({ name, canonical }) => ({
            name,
            slug: slugByCanonical.get(canonical) ?? null,
          })),
  };
};
