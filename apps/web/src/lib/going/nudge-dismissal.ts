// Per-device record of answered "Still going?" nudges (#70).
//
// localStorage for v1, deliberately — no user-record sync. The accepted cost is
// that a second device may ask once more; the alternative is a write endpoint
// and a migration for a banner that fires at most once per show.
//
// Read/write/guard shape follows the shipped lib/pwa/post-watch-dismissal.ts,
// and the parsed blob goes through a type guard the way install-dismissal.ts
// does — `apps/web` carries no Zod dependency, and localStorage is untrusted
// input, so it must be narrowed rather than cast.

const KEY = 'cc-nudge-dismissed'

export type NudgeOutcome = 'going' | 'declined' | 'dismissed'

const OUTCOMES: readonly string[] = ['going', 'declined', 'dismissed']

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

export const readNudgeState = (eventId: string): NudgeOutcome | null =>
  readStore()[eventId] ?? null

export const markNudge = (eventId: string, outcome: NudgeOutcome): void => {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...readStore(), [eventId]: outcome }),
    )
  } catch (writeErr) {
    // Quota-exceeded or disabled storage — no-op so a failed persist can't
    // break the click handler. Worst case the banner returns on next visit.
    console.warn('nudge-dismissal: write failed', writeErr)
  }
}
