/**
 * Pure helpers for the co-headliner backfill script (#1203). Extracted so the
 * test file can import them without pulling in @anthropic-ai/sdk, drizzle-orm,
 * or @concert-crawl/db — those live in the main script file.
 *
 * No external dependencies; tests can run from any context.
 */

export interface EventForHeadlinerCheck {
  id: string
  title: string
  artist: string
  supportingArtists: string[] | null
  date: string
  venueName: string
}

export interface HeadlinerResult {
  eventId: string
  title: string
  artist: string
  date: string
  venueName: string
  currentSupporting: string[] | null
  /**
   * The headliner list we would write. Always starts with the stored `artist`
   * string (invariant 1 of #1203) and has length >= 1. `wouldChange` is only
   * true when length >= 2.
   */
  proposedHeadliners: string[]
  /** supporting_artists with any promoted co-headliner removed. */
  proposedSupporting: string[]
  wouldChange: boolean
}

export interface BatchHeadliners {
  eventId: string
  headliners: string[]
}

/**
 * Cheap SQL-side net, mirrored here for testing. An artist string containing
 * `&`, `+`, or a standalone `and` COULD be a co-headline bill — or could just
 * be a band whose registered name contains one ("Iron & Wine", "Hall & Oates",
 * "Florence + the Machine", "Earth, Wind & Fire"). This predicate only decides
 * what gets shown to the LLM. It NEVER decides that a bill is a co-headline,
 * and nothing anywhere splits an artist string on punctuation.
 *
 * `and` is word-boundaried so "Portland" and "Sandy" are not candidates.
 */
export const CO_HEADLINER_CANDIDATE_PATTERN = /&|\+|\band\b/i

export function isCoHeadlinerCandidate(artist: string): boolean {
  return CO_HEADLINER_CANDIDATE_PATTERN.test(artist)
}

export function buildBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let idx = 0; idx < items.length; idx += batchSize) {
    batches.push(items.slice(idx, idx + batchSize))
  }
  return batches
}

/**
 * Comparison fold used ONLY to decide whether two headliner strings name the
 * same act (so the LLM re-spelling "sigur ros" doesn't get appended alongside
 * the stored "Sigur Rós"). Deliberately NOT canonicalizeArtist(), which splits
 * on " & " and would collapse "Iron & Wine" to "iron". Nothing written to the
 * DB comes out of this function.
 */
const foldForCompare = (val: string): string =>
  val
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Builds the headliner list to write for one event.
 *
 * The stored `artist` string is ALWAYS position 0 — the crawler never rewrites
 * `artist`, and read paths assume `headliners[0] === artist`. If the LLM
 * re-spells the primary act (different casing or diacritics), its spelling is
 * dropped in favour of the stored one rather than appended as a second act.
 *
 * Remaining headliners keep the LLM's order, deduped case-insensitively.
 */
export function buildHeadlinerUpdate(
  storedArtist: string,
  llmHeadliners: string[],
  currentSupporting: string[] | null,
): { headliners: string[]; supportingArtists: string[]; wouldChange: boolean } {
  const seen = new Set<string>([foldForCompare(storedArtist)])
  const headliners = [storedArtist]
  for (const candidate of llmHeadliners) {
    const trimmed = candidate.trim()
    if (trimmed === '') continue
    const folded = foldForCompare(trimmed)
    if (seen.has(folded)) continue
    seen.add(folded)
    headliners.push(trimmed)
  }

  // A promoted co-headliner must not remain listed as their own opener.
  const promoted = new Set(headliners.slice(1).map(foldForCompare))
  const supportingArtists = (currentSupporting ?? []).filter(
    (act) => !promoted.has(foldForCompare(act)),
  )

  return { headliners, supportingArtists, wouldChange: headliners.length > 1 }
}

/**
 * Names the LLM returned that are not traceable to anything already stored on
 * the row. A genuine co-headliner is always a fragment of the flattened
 * `artist` string ("Sleep Token & Sleep Theory") or an act already sitting in
 * `supporting_artists` — the model's job is to decide where the bill splits,
 * never to supply a name from its own knowledge. Anything else is a
 * hallucination or a re-spelling, and this backfill writes text straight to a
 * consumer-visible column, so those rows are skipped rather than trusted.
 */
export function untraceableHeadliners(
  storedArtist: string,
  supportingArtists: string[] | null,
  proposedHeadliners: string[],
): string[] {
  const artistHaystack = foldForCompare(storedArtist)
  const supportingFolded = new Set(
    (supportingArtists ?? []).map(foldForCompare),
  )
  // Position 0 is the stored artist by construction, so only the promoted acts
  // need checking.
  return proposedHeadliners.slice(1).filter((name) => {
    const folded = foldForCompare(name)
    return !artistHaystack.includes(folded) && !supportingFolded.has(folded)
  })
}

const escapeCsv = (val: string): string => {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function formatCsvRow(result: HeadlinerResult): string {
  return (
    [
      result.eventId,
      result.date,
      escapeCsv(result.venueName),
      escapeCsv(result.title),
      escapeCsv(result.artist),
      escapeCsv((result.currentSupporting ?? []).join(' | ')),
      escapeCsv(result.proposedHeadliners.join(' | ')),
      String(result.wouldChange),
    ].join(',') + '\n'
  )
}
