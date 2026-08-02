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

import { db, artists } from '@concert-crawl/db'
import { inArray } from 'drizzle-orm'
import { canonicalizeArtist } from '@concert-crawl/types'

export interface ResolvedArtistSlugs {
  /** The headliner's slug, or null when the projection has no row. */
  artistSlug: string | null
  /**
   * Positionally aligned with the `supportingArtists` argument — same length,
   * same order, `null` where that name has no row. Null when the argument is
   * null (a legacy pre-recrawl event row).
   */
  supportingArtistSlugs: Array<string | null> | null
}

export const resolveArtistSlugs = async (
  headliner: string,
  supportingArtists: string[] | null,
): Promise<ResolvedArtistSlugs> => {
  const headlinerCanonical = canonicalizeArtist(headliner)
  const supportingCanonical = (supportingArtists ?? []).map((name) =>
    canonicalizeArtist(name),
  )

  // One lookup for every distinct non-empty canonical name on the bill.
  // canonicalizeArtist can return '' (a name that is punctuation only), which
  // matches nothing and would only bloat the IN list.
  const lookup = [...new Set([headlinerCanonical, ...supportingCanonical])]
    .filter((canonical) => canonical !== '')
    .sort()

  const rows =
    lookup.length === 0
      ? []
      : await db
          .select({
            canonicalName: artists.canonicalName,
            slug: artists.slug,
          })
          .from(artists)
          .where(inArray(artists.canonicalName, lookup))

  const slugByCanonical = new Map(
    rows.map((row) => [row.canonicalName, row.slug]),
  )

  return {
    artistSlug: slugByCanonical.get(headlinerCanonical) ?? null,
    supportingArtistSlugs:
      supportingArtists === null
        ? null
        : supportingCanonical.map(
            (canonical) => slugByCanonical.get(canonical) ?? null,
          ),
  }
}
