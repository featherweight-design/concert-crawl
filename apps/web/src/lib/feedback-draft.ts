// apps/web/src/lib/feedback-draft.ts
// localStorage-backed draft persistence for the consumer feedback modal.
// Used by FeedbackModal to support issue #830 ("Save and come back").
//
// SSR-safe: every public helper short-circuits on the server. The TTL
// keeps stale drafts (e.g. a user who never returned) from rehydrating
// weeks later. The runtime type checks guard against tampered/corrupt
// entries (defence in depth — the data came from this browser's own
// localStorage, but a corrupt or schema-drifted entry would crash the
// modal if rendered as-is).

export const FEEDBACK_DRAFT_KEY = 'feedback-draft-v1'
export const FEEDBACK_DRAFT_TTL_MS = 72 * 60 * 60 * 1000 // 72h

const VALID_CATEGORIES = ['bug', 'idea', 'praise', 'other'] as const
type FeedbackCategory = (typeof VALID_CATEGORIES)[number]

export interface FeedbackDraftScreenshot {
  name: string
  dataUrl: string
}

export interface FeedbackDraft {
  category: FeedbackCategory | null
  message: string
  screenshot: FeedbackDraftScreenshot | null
  savedAt: number
}

function isBrowser(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Property access on `localStorage` can throw in sandboxed iframes
    // and strict privacy modes (e.g. Safari ITP with cross-site storage
    // blocked). The `typeof` check alone isn't enough — the engine
    // evaluates the operand which trips the SecurityError. Wrapping in
    // try/catch preserves the SSR-safe short-circuit contract.
    return typeof localStorage !== 'undefined'
  } catch (err) {
    console.warn('feedback-draft: localStorage access blocked', err)
    return false
  }
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function isFeedbackCategory(val: unknown): val is FeedbackCategory {
  return (
    typeof val === 'string' &&
    (VALID_CATEGORIES as readonly string[]).includes(val)
  )
}

function isScreenshot(val: unknown): val is FeedbackDraftScreenshot {
  return (
    isRecord(val) &&
    typeof val['name'] === 'string' &&
    typeof val['dataUrl'] === 'string'
  )
}

function isFeedbackDraft(val: unknown): val is FeedbackDraft {
  if (!isRecord(val)) return false
  const categoryOk =
    val['category'] === null || isFeedbackCategory(val['category'])
  const messageOk = typeof val['message'] === 'string'
  const screenshotOk =
    val['screenshot'] === null || isScreenshot(val['screenshot'])
  const savedAtOk =
    typeof val['savedAt'] === 'number' && Number.isFinite(val['savedAt'])
  return categoryOk && messageOk && screenshotOk && savedAtOk
}

export function saveDraft(
  draft: Omit<FeedbackDraft, 'savedAt'>,
): FeedbackDraft | null {
  if (!isBrowser()) return null
  const payload: FeedbackDraft = { ...draft, savedAt: Date.now() }
  try {
    localStorage.setItem(FEEDBACK_DRAFT_KEY, JSON.stringify(payload))
    return payload
  } catch (err) {
    // Quota exceeded (e.g. very large screenshot) or storage disabled.
    // Surface to console so beta testers see it; do not throw.
    console.error('feedback-draft: failed to save draft', err)
    return null
  }
}

export function loadDraft(now: number = Date.now()): FeedbackDraft | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isFeedbackDraft(parsed)) {
      // Corrupt or schema-drifted entry — clear to avoid sticky bad state.
      localStorage.removeItem(FEEDBACK_DRAFT_KEY)
      return null
    }
    if (now - parsed.savedAt > FEEDBACK_DRAFT_TTL_MS) {
      localStorage.removeItem(FEEDBACK_DRAFT_KEY)
      return null
    }
    return parsed
  } catch (err) {
    console.error('feedback-draft: failed to load draft', err)
    return null
  }
}

export function clearDraft(): void {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(FEEDBACK_DRAFT_KEY)
  } catch (err) {
    console.error('feedback-draft: failed to clear draft', err)
  }
}
