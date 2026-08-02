import { artists, db } from '@concert-crawl/db'
import { artistSlug, resolveSlug } from '@concert-crawl/types'
import { reportFailure } from '@concert-crawl/logger'

/**
 * Crawler write-through for the `artists` projection table (#1115).
 *
 * The nightly backfill is not enough on its own: a venue that announces a
 * brand-new headliner today should have an artist page today, not after the
 * next backfill run. Every crawl therefore projects the artists it just wrote
 * into `artists`, insert-only.
 *
 * Deliberately NOT run inside the event upsert's transaction. Crawl data is
 * the product's core value — an artist-projection hiccup must never cost an
 * event row — so this runs after the events are durable and swallows its own
 * failures (logged, never rethrown). The backfill script is the repair path.
 */

export interface ArtistProjectionInput {
  /** Raw, display-cased artist string as billed by the venue. */
  name: string
  /** canonicalizeArtist() output — the join key and uniqueness key. */
  canonicalName: string
}

/**
 * Inserts any canonical artist not already present. Existing rows are left
 * untouched: their slug is a live URL and their display name may have been
 * corrected by an admin.
 *
 * Returns the number of rows inserted. Never throws.
 */
export async function projectArtists(
  candidates: ArtistProjectionInput[],
  database: typeof db = db,
): Promise<number> {
  try {
    // Collapse to one entry per canonical name, first spelling wins — the
    // display name is only a seed here; the backfill's most-frequent-spelling
    // pass and PR-C's admin surface are the authorities.
    const byCanonical = new Map<string, string>()
    for (const candidate of candidates) {
      if (candidate.canonicalName === '') continue
      if (!byCanonical.has(candidate.canonicalName)) {
        byCanonical.set(candidate.canonicalName, candidate.name)
      }
    }
    if (byCanonical.size === 0) return 0

    const existing = await database
      .select({ canonicalName: artists.canonicalName, slug: artists.slug })
      .from(artists)
    const taken = new Set(existing.map((row) => row.slug))
    const alreadyProjected = new Set(existing.map((row) => row.canonicalName))

    const values: (typeof artists.$inferInsert)[] = []
    for (const [canonicalName, name] of byCanonical) {
      if (alreadyProjected.has(canonicalName)) continue
      const slug = resolveSlug(artistSlug(canonicalName), taken, canonicalName)
      taken.add(slug)
      values.push({ name, canonicalName, slug })
    }
    if (values.length === 0) return 0

    // onConflictDoNothing covers the race where a concurrent crawl or the
    // backfill claimed the same canonical name (or the same slug) between the
    // SELECT above and this INSERT. The loser simply skips; the next run picks
    // the artist up with a freshly resolved slug.
    const inserted = await database
      .insert(artists)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: artists.id })

    return inserted.length
  } catch (err) {
    reportFailure({
      event: 'crawl.artist_projection_failed',
      severity: 'warn',
      candidateCount: candidates.length,
      error: err instanceof Error ? err.message : String(err),
    })
    return 0
  }
}
