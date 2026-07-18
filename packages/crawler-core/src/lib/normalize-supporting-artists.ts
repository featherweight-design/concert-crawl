/**
 * Canonical normalization for an event's supporting-artist (opener) list.
 *
 * Both extractor paths (LLM and JSON-LD) and the one-time DB cleanup script
 * must produce byte-identical results, so the rule lives here rather than
 * being re-implemented at each call site — divergent normalization is exactly
 * what caused the Ø/ø backfill mismatch in the past.
 *
 * The rule: trim each name, drop blank/whitespace-only entries, and drop any
 * opener that repeats the headliner case-insensitively. A venue that lists the
 * headliner again inside `performer[]` (or an LLM response that disobeys the
 * "exclude the headliner" instruction) must never surface the headliner as its
 * own opener — once bold, once in the "with …" line (#643).
 */
export function normalizeSupportingArtists(
  artist: string,
  names: readonly string[],
): string[] {
  const headlinerKey = artist.trim().toLowerCase()
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name.toLowerCase() !== headlinerKey)
}
