// Per-device record of answered "Going to this show?" nudges (#70).
//
// localStorage for v1, deliberately — no user-record sync. The accepted cost is
// that a second device may ask once more; the alternative is a write endpoint
// and a migration for a banner that fires at most once per show.
//
// Records are keyed by `userEventId` — the watch row — not by `eventId`.
// Unwatching deletes that row, so re-watching mints a new id and the nudge gets
// to ask again. Keying by event made a single dismissal permanent for that show
// no matter how many times the user re-watched it.
//
// Read/write/guard shape follows the shipped lib/pwa/post-watch-dismissal.ts,
// and the parsed blob goes through a type guard the way install-dismissal.ts
// does — `apps/web` carries no Zod dependency, and localStorage is untrusted
// input, so it must be narrowed rather than cast.

// Distinct from the retired `cc-nudge-dismissed`: both the key space
// (userEventId, not eventId) and the outcome set changed, so a fresh key avoids
// the guard rejecting a whole legacy store over one unrecognised value.
const KEY = 'cc-nudge-answered'

export type NudgeOutcome = 'going' | 'dismissed'

const OUTCOMES: readonly string[] = ['going', 'dismissed']

const isStore = (value: unknown): value is Record<string, NudgeOutcome> => {
  // Arrays and null are typeof 'object' — both must be rejected before the
  // Object.values walk, which would otherwise accept `['going']`.
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every(
    (outcome) => typeof outcome === 'string' && OUTCOMES.includes(outcome),
  )
}

const readStore = (): Record<string, NudgeOutcome> => {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return isStore(parsed) ? parsed : {}
  } catch (readErr) {
    console.warn('nudge-dismissal: dropping unreadable record', readErr)
    return {}
  }
}

export const readNudgeState = (userEventId: string): NudgeOutcome | null =>
  readStore()[userEventId] ?? null

export const markNudge = (userEventId: string, outcome: NudgeOutcome): void => {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...readStore(), [userEventId]: outcome }),
    )
  } catch (writeErr) {
    // Quota-exceeded or disabled storage — no-op so a failed persist can't
    // break the click handler. Worst case the banner returns on next visit.
    console.warn('nudge-dismissal: write failed', writeErr)
  }
}
