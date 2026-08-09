// Per-device record of answered first-watch follow nudges (native following,
// PR 10).
//
// localStorage, deliberately, and for the same reason lib/going/nudge-
// dismissal.ts is: the accepted cost is that a second device may ask once
// more, and the alternative is a write endpoint plus a migration for a card
// that fires at most once per watch.
//
// ⚠️ Records are keyed by `userEventId` — the WATCH ROW — never by `eventId`.
// This is the #70 bug restated in the eng spec §8.4: `eventId` is immortal,
// `userEventId` dies when the user un-watches. Keyed by the event, one
// dismissal would silence the nudge for that show forever, including after
// un-watch then re-watch. Keyed by the row, re-watching mints a new id and the
// nudge legitimately gets to ask again.
//
// One deliberate exception rides along: a user who is ALSO attending keeps the
// same row through an un-watch (see the API's releaseWatch), so their answer
// persists. That is the honest outcome — nothing about their relationship to
// the show actually restarted.
//
// The parsed blob goes through a type guard rather than a cast: `apps/web`
// carries no Zod dependency and localStorage is untrusted input.

// Its own key space, not shared with `cc-nudge-answered` (the going nudge):
// same key shape, unrelated question, and one store rejecting the other's
// values would drop both.
const KEY = 'cc-nf-nudge-answered'

// One outcome, not two. Dismissing and following both end the nudge, and
// nothing downstream reads which — the follow itself is already recorded
// server-side, so a second local copy of it would only be somewhere to drift.
type Answered = true

const isStore = (value: unknown): value is Record<string, Answered> => {
  // Arrays and null are typeof 'object' — both must be rejected before the
  // values walk, which would otherwise accept `[true]`.
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every((answered) => answered === true)
}

const readStore = (): Record<string, Answered> => {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return isStore(parsed) ? parsed : {}
  } catch (readErr) {
    console.warn('follow nudge: dropping unreadable record', readErr)
    return {}
  }
}

/** Whether this watch row has already had its follow nudge answered. */
export const isFollowNudgeAnswered = (userEventId: string): boolean =>
  readStore()[userEventId] === true

/** Close the nudge for this watch row, whichever way the user answered it. */
export const markFollowNudgeAnswered = (userEventId: string): void => {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...readStore(), [userEventId]: true }),
    )
  } catch (writeErr) {
    // Quota-exceeded or disabled storage — a no-op, so a failed persist can
    // never break the click handler. Worst case the nudge returns next visit.
    console.warn('follow nudge: write failed', writeErr)
  }
}
