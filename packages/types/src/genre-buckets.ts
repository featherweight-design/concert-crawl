// Vibe filter bucket taxonomy (#1101). Prod stores whatever the LLM extractor
// invents in events.genre (85 distinct values as of the sweep), which makes
// the Browse "Vibe" dropdown unusable. This module collapses the long tail
// into 16 canonical buckets that the /v1/events/genres endpoint surfaces,
// and expands a selected bucket back to its sub-genre set at query time so
// picking "electronic" also surfaces house / dubstep / bass / etc.
//
// Sub-genres appear verbatim as they exist in the DB. Where LLM drift produced
// case variants (Americana / americana) BOTH are listed so array-overlap
// filtering matches either row without a normalisation migration.

const GENRE_BUCKETS_SOURCE = {
  classical: ['classical', 'opera', 'instrumental'],
  comedy: ['comedy'],
  country: ['country'],
  electronic: [
    'electronic',
    'house',
    'dubstep',
    'bass',
    'drum and bass',
    'drum',
    'dance',
    'techno',
    'rave',
    'trap',
    'ambient',
    'lo-fi',
    'dub',
    'disco',
    'experimental',
  ],
  folk: [
    'folk',
    'americana',
    'Americana',
    'bluegrass',
    'indie folk',
    'singer-songwriter',
  ],
  'hip-hop': ['hip-hop', 'rap', 'r&b', 'grime'],
  indie: ['indie', 'indie pop', 'indie rock'],
  jam: ['jam'],
  jazz: ['jazz', 'blues', 'soul', 'funk', 'gospel', 'swing'],
  latin: ['latin', 'latino', 'reggaeton', 'regional mexican', 'cumbia'],
  metal: [
    'metal',
    'heavy metal',
    'doom metal',
    'doom',
    'death metal',
    'deathcore',
    'metalcore',
    'industrial',
    'gothic',
    'darkwave',
    'visual kei',
  ],
  pop: ['pop', 'k-pop', 'K-POP', 'pop rock'],
  punk: [
    'punk',
    'punk rock',
    'post-punk',
    'hardcore',
    'hardcore punk',
    'post-hardcore',
    'emo',
    'emo pop',
    'pop punk',
    'ska',
    'new wave',
  ],
  reggae: ['reggae'],
  rock: [
    'rock',
    'alternative',
    'alternative rock',
    'progressive rock',
    'progressive',
    'garage rock',
    'psychedelic',
    'stoner',
  ],
  world: ['world', 'bollywood', 'indigenous'],
} as const satisfies Record<string, readonly string[]>

export type GenreBucket = keyof typeof GENRE_BUCKETS_SOURCE

// Type guard against the source-object keys — the ONE place we know the
// membership check narrows to GenreBucket. Downstream lookups use this
// instead of `as GenreBucket` casts so a typo in a bucket label surfaces
// at type-check time.
export function isGenreBucket(value: string): value is GenreBucket {
  return Object.prototype.hasOwnProperty.call(GENRE_BUCKETS_SOURCE, value)
}

// Alphabetically sorted list of bucket labels. The endpoint returns these
// labels; the web filter dropdown renders them.
export const BUCKET_LABELS: readonly GenreBucket[] = Object.keys(
  GENRE_BUCKETS_SOURCE,
)
  .filter(isGenreBucket)
  .sort()

// Lowercase-keyed reverse index: sub-genre → bucket. Case-insensitive to
// absorb LLM drift (K-POP vs k-pop, Americana vs americana). Whitespace is
// trimmed in the lookup helper — never bake either into the key.
const GENRE_TO_BUCKET: ReadonlyMap<string, GenreBucket> = (() => {
  const entries: [string, GenreBucket][] = []
  for (const bucket of BUCKET_LABELS) {
    for (const sub of GENRE_BUCKETS_SOURCE[bucket]) {
      entries.push([sub.toLowerCase(), bucket])
    }
  }
  return new Map(entries)
})()

/**
 * Map a raw genre string (as stored on events.genre) to its bucket label,
 * or null if the genre is unbucketed (long-tail / non-music / <UNKNOWN>).
 *
 * Case- and whitespace-insensitive so LLM drift never silently drops rows.
 */
export function bucketForGenre(rawGenre: string): GenreBucket | null {
  const key = rawGenre.trim().toLowerCase()
  if (key === '') return null
  return GENRE_TO_BUCKET.get(key) ?? null
}

/**
 * Expand a bucket label to the full list of raw genre strings that should
 * satisfy a filterVibe query for that bucket. Used to build the array-overlap
 * predicate on events.genre.
 *
 * If the input is NOT a known bucket, returns a single-element array with the
 * input verbatim — back-compat with bookmarked URLs like `filterVibe=dubstep`
 * from before this shipped. Case/whitespace are preserved on the fallback so
 * exact-string overlap still matches raw DB values.
 */
export function expandBucket(bucketOrRaw: string): readonly string[] {
  const key = bucketOrRaw.trim().toLowerCase()
  if (isGenreBucket(key)) {
    return GENRE_BUCKETS_SOURCE[key]
  }
  return [bucketOrRaw]
}

/**
 * Resolve an active Vibe filter value to the raw genre strings belonging to its
 * bucket, or null when the value is not a known bucket.
 *
 * The null return is a safety fallback, not an error case: callers use it to
 * decide whether a row's genres may be reordered so the matched one leads. No
 * membership set means no reorder — never a wrong one.
 *
 * Deliberately not `expandBucket`, which echoes an unknown value back verbatim
 * so a bookmarked `filterVibe=dubstep` URL still matches rows by exact overlap.
 * That fallback is right for querying and wrong for reordering: a one-element
 * array holding the raw filter string makes every genre look like a non-member.
 */
export function bucketMembersFor(
  filterValue: string | null | undefined,
): readonly string[] | null {
  if (filterValue === null || filterValue === undefined) return null
  const key = filterValue.trim().toLowerCase()
  if (!isGenreBucket(key)) return null
  return expandBucket(key)
}

/**
 * Given the raw genre strings observed in the DB, return the sorted set of
 * bucket labels those genres collectively cover. Unbucketed genres are
 * silently dropped — they still filter and search normally, but they no
 * longer clutter the Vibe dropdown.
 */
export function bucketsPresentIn(rawGenres: readonly string[]): GenreBucket[] {
  const seen = new Set<GenreBucket>()
  for (const raw of rawGenres) {
    const bucket = bucketForGenre(raw)
    if (bucket !== null) seen.add(bucket)
  }
  return Array.from(seen).sort()
}
