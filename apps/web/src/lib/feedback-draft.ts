// apps/web/src/lib/feedback-draft.ts
// localStorage-backed draft persistence for the consumer feedback modal.
// Used by FeedbackModal: a failed send saves the draft by itself (#830).
//
// SSR-safe: every public helper short-circuits on the server. The TTL
// keeps stale drafts (e.g. a user who never returned) from rehydrating
// weeks later. The runtime type checks guard against tampered/corrupt
// entries (defence in depth — the data came from this browser's own
// localStorage, but a corrupt or schema-drifted entry would crash the
// modal if rendered as-is).

export const FEEDBACK_DRAFT_KEY = 'feedback-draft-v1';
export const FEEDBACK_DRAFT_TTL_MS = 72 * 60 * 60 * 1000; // 72h

import {
  FAN_FEEDBACK_CATEGORIES,
  type FanFeedbackCategory,
} from '@concert-crawl/types';

export interface FeedbackDraftScreenshot {
  name: string;
  dataUrl: string;
}

export interface FeedbackDraft {
  category: FanFeedbackCategory | null;
  message: string;
  screenshot: FeedbackDraftScreenshot | null;
  // Suggest a venue's own fields (757 A5). A draft saved before they existed
  // has neither key, and loads with both empty.
  venueName: string;
  website: string;
  savedAt: number;
}

// What a stored entry may hold: the venue keys can be missing.
type StoredDraft = Omit<FeedbackDraft, 'venueName' | 'website'> &
  Partial<Pick<FeedbackDraft, 'venueName' | 'website'>>;

function isBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Property access on `localStorage` can throw in sandboxed iframes
    // and strict privacy modes (e.g. Safari ITP with cross-site storage
    // blocked). The `typeof` check alone isn't enough — the engine
    // evaluates the operand which trips the SecurityError. Wrapping in
    // try/catch preserves the SSR-safe short-circuit contract.
    return typeof localStorage !== 'undefined';
  } catch (err) {
    console.warn('feedback-draft: localStorage access blocked', err);
    return false;
  }
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isFeedbackCategory(val: unknown): val is FanFeedbackCategory {
  return (
    typeof val === 'string' &&
    FAN_FEEDBACK_CATEGORIES.some((category) => category === val)
  );
}

const isOptionalString = (val: unknown): boolean =>
  val === undefined || typeof val === 'string';

function isScreenshot(val: unknown): val is FeedbackDraftScreenshot {
  return (
    isRecord(val) &&
    typeof val['name'] === 'string' &&
    typeof val['dataUrl'] === 'string'
  );
}

function isStoredDraft(val: unknown): val is StoredDraft {
  if (!isRecord(val)) return false;
  const categoryOk =
    val['category'] === null || isFeedbackCategory(val['category']);
  const messageOk = typeof val['message'] === 'string';
  const screenshotOk =
    val['screenshot'] === null || isScreenshot(val['screenshot']);
  const savedAtOk =
    typeof val['savedAt'] === 'number' && Number.isFinite(val['savedAt']);
  const venueOk =
    isOptionalString(val['venueName']) && isOptionalString(val['website']);
  return categoryOk && messageOk && screenshotOk && savedAtOk && venueOk;
}

export function saveDraft(
  draft: Omit<FeedbackDraft, 'savedAt'>,
): FeedbackDraft | null {
  if (!isBrowser()) return null;
  const payload: FeedbackDraft = { ...draft, savedAt: Date.now() };
  try {
    localStorage.setItem(FEEDBACK_DRAFT_KEY, JSON.stringify(payload));
    return payload;
  } catch (err) {
    // Quota exceeded (e.g. very large screenshot) or storage disabled.
    // Surface to console so beta testers see it; do not throw.
    console.error('feedback-draft: failed to save draft', err);
    return null;
  }
}

export function loadDraft(now: number = Date.now()): FeedbackDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredDraft(parsed)) {
      // Corrupt or schema-drifted entry — clear to avoid sticky bad state.
      localStorage.removeItem(FEEDBACK_DRAFT_KEY);
      return null;
    }
    if (now - parsed.savedAt > FEEDBACK_DRAFT_TTL_MS) {
      localStorage.removeItem(FEEDBACK_DRAFT_KEY);
      return null;
    }
    return {
      ...parsed,
      venueName: parsed.venueName ?? '',
      website: parsed.website ?? '',
    };
  } catch (err) {
    // JSON.parse threw (truncated/invalid payload) or some other read
    // failure. Purge the bad entry so reopening the modal doesn't log
    // the same error indefinitely (#834 Copilot R2).
    console.error('feedback-draft: failed to load draft', err);
    try {
      localStorage.removeItem(FEEDBACK_DRAFT_KEY);
    } catch (removeErr) {
      console.warn('feedback-draft: failed to purge corrupt entry', removeErr);
    }
    return null;
  }
}

export function clearDraft(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(FEEDBACK_DRAFT_KEY);
  } catch (err) {
    console.error('feedback-draft: failed to clear draft', err);
  }
}
