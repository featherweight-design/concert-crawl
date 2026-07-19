const KEY = 'cc-install-dismissal'
const LEGACY_KEY = 'cc-install-dismissed'
const QUIET_MS = 30 * 24 * 60 * 60 * 1000

interface DismissalRecord {
  count: number
  firstDismissedAt: string
}

// Manual type guard instead of Zod — install-dismissal is the only user of
// Zod on the client, so importing it adds ~13kb to the bundle for a 2-field
// record. This guard covers the same shape checks the schema did. The `in`
// operator narrows `value` step-by-step so no `as` cast is required.
const isValidRecord = (value: unknown): value is DismissalRecord => {
  if (typeof value !== 'object' || value === null) return false
  if (!('count' in value) || !('firstDismissedAt' in value)) return false
  const { count, firstDismissedAt } = value
  if (typeof count !== 'number') return false
  if (!Number.isInteger(count)) return false
  if (count < 0 || count > 2) return false
  if (typeof firstDismissedAt !== 'string') return false
  // Reject NaN dates from a malformed ISO string.
  if (Number.isNaN(new Date(firstDismissedAt).getTime())) return false
  return true
}

export type DismissalState = 'active' | 'quiet' | 'retired'

const readRecord = (): DismissalRecord | null => {
  // Merely accessing `localStorage` can throw a SecurityError in privacy
  // modes or iframes with restricted storage — do the typeof + getItem
  // together inside the try/catch so no path bypasses the guard.
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      return isValidRecord(parsed) ? parsed : null
    }
    // Legacy migration — the Tier B install prompt (removed with #969) wrote
    // `cc-install-dismissed = '1'` to remember a dismiss. Anyone who dismissed
    // that prompt should stay dismissed under the new store. Treat the legacy
    // flag as a hard retire (count=2) so it never re-surfaces the ask.
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy === '1') {
      return { count: 2, firstDismissedAt: new Date(0).toISOString() }
    }
    return null
  } catch (readErr) {
    console.warn('install-dismissal: dropping unreadable record', readErr)
    return null
  }
}

export const getDismissalState = (now: Date = new Date()): DismissalState => {
  const record = readRecord()
  if (!record) return 'active'
  if (record.count >= 2) return 'retired'
  const first = new Date(record.firstDismissedAt).getTime()
  return now.getTime() - first < QUIET_MS ? 'quiet' : 'active'
}

export const dismissOnce = (now: Date = new Date()): void => {
  try {
    if (typeof localStorage === 'undefined') return
    const existing = readRecord()
    // Clamp count to 2 — isValidRecord rejects >2 on the next read, which
    // would return null and revert the UI to `active` instead of staying
    // `retired`.
    const next = existing
      ? {
          count: Math.min(existing.count + 1, 2),
          firstDismissedAt: existing.firstDismissedAt,
        }
      : { count: 1, firstDismissedAt: now.toISOString() }
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (writeErr) {
    console.warn('install-dismissal: failed to persist dismiss', writeErr)
  }
}
