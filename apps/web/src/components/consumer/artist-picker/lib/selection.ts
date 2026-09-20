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
 *
 * Well-typed is not the same as usable, so the survivors are normalized too:
 * blanks would ride into `?genres=` — a shape the server 400s on — and
 * duplicates would inflate the "follow N artists" count above the number of
 * tiles actually ticked.
 */
function parseSlugs(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const slugs: string[] = []
    for (const value of parsed) {
      if (typeof value !== 'string') return null
      const slug = value.trim()
      if (slug !== '' && !slugs.includes(slug)) slugs.push(slug)
    }
    return slugs
  } catch (err: unknown) {
    // Corrupt JSON is indistinguishable from no mirror at all, and the right
    // answer to both is the same: fall back to whatever state the caller has.
    // It still logs, because a silent return here reads exactly like a mirror
    // that was never written when someone is chasing a lost selection.
    console.warn('artist picks mirror parse failed', err)
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

/**
 * The step the tour is on, mirrored beside the picks.
 *
 * It exists for the same round trip the picks do, and closes the half they
 * missed. A locked visitor who upgrades mid-tour normally confirms in place —
 * the sheet's checkout is embedded — but a redirect-based payment method in
 * Stripe's Payment Element does leave the page and come back to
 * `return_url`, which is `/onboarding`. The picks restore; the index did not,
 * so a visitor who had just paid landed on step 1 of 8 holding their
 * selection, six presses from the rail they were firing.
 *
 * `session`, like the picks: a step is a thing you are in the middle of, not
 * a preference. Out of range reads as absent, so shrinking the flow can never
 * strand anyone past its end.
 */
export const STEP_INDEX_KEY = 'cc.onboarding.stepIndex'

export function readStepIndex(total: number): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.sessionStorage.getItem(STEP_INDEX_KEY)
    if (raw === null) return 0
    // `Number`, not `parseInt`: the latter truncates, so a stored "3.5" would
    // read back as step 3 rather than as the corruption it is. Nothing writes
    // a fraction here, so anything that is not a whole number came from
    // somewhere that does not get to choose the step.
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed >= total) return 0
    return parsed
  } catch (err: unknown) {
    console.warn('onboarding step mirror read failed', err)
    return 0
  }
}

/** Step 0 clears rather than storing `0` — see `writePicks` for the reasoning. */
export function writeStepIndex(index: number): void {
  if (typeof window === 'undefined') return
  try {
    if (index <= 0) {
      window.sessionStorage.removeItem(STEP_INDEX_KEY)
      return
    }
    window.sessionStorage.setItem(STEP_INDEX_KEY, String(index))
  } catch (err: unknown) {
    console.warn('onboarding step mirror write failed', err)
  }
}
