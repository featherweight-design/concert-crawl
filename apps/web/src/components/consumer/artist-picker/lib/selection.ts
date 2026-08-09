// sessionStorage mirror of an in-progress picker selection (PK-18, OB-06).
//
// Every function here is a no-op on the server and swallows storage failures:
// Safari private mode throws on `setItem`, and losing the MIRROR is survivable
// (component state still holds the picks) while throwing out of a click
// handler is not.

/**
 * Parsed with a real element-by-element check rather than a cast. The value
 * came out of a store the user can edit with two lines of console, so
 * `JSON.parse` returning "something" says nothing about it being `string[]`.
 */
function parseSlugs(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    if (!parsed.every((value) => typeof value === 'string')) return null
    return parsed
  } catch {
    // Corrupt JSON is indistinguishable from no mirror at all, and the right
    // answer to both is the same: fall back to whatever state the caller has.
    return null
  }
}

/** `[]` for "no mirror", so callers never have to spell the empty case twice. */
export function readPicks(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw === null) return []
    return parseSlugs(raw) ?? []
  } catch (err: unknown) {
    console.warn('artist picks mirror read failed', err)
    return []
  }
}

/**
 * Writing an empty selection CLEARS rather than storing `[]`. A stored empty
 * array and a missing key mean the same thing to `readPicks`, and leaving the
 * key behind would make a stale mirror outlive the step that owned it.
 */
export function writePicks(key: string, slugs: readonly string[]): void {
  if (typeof window === 'undefined') return
  try {
    if (slugs.length === 0) {
      window.sessionStorage.removeItem(key)
      return
    }
    window.sessionStorage.setItem(key, JSON.stringify(Array.from(slugs)))
  } catch (err: unknown) {
    console.warn('artist picks mirror write failed', err)
  }
}

/** Called on a committed write or an explicit skip, never on unmount. */
export function clearPicks(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
  } catch (err: unknown) {
    console.warn('artist picks mirror clear failed', err)
  }
}
