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

import {
  FAN_FEEDBACK_CATEGORIES,
  MAX_FEEDBACK_MESSAGE_LENGTH,
  type FanFeedbackCategory,
} from '@concert-crawl/types';

export const FEEDBACK_DRAFT_KEY = 'feedback-draft-v2';

// v1 kept every draft, signed in or not, under one device-wide key, and an
// entry does not say whose it was. Any of them may hold a signed-in fan's note,
// so each is removed unread, a signed-out fan's pending draft included.
export const LEGACY_FEEDBACK_DRAFT_KEY = 'feedback-draft-v1';

// A signed-in fan's draft is kept under their own user id, so the next person
// to sign in on a shared phone never sees it (Hugh, 2026-11-22). A signed-out
// draft has the one device-wide key.
export const feedbackDraftKey = (userId: string | null): string =>
  userId === null ? FEEDBACK_DRAFT_KEY : `${FEEDBACK_DRAFT_KEY}:${userId}`;
export const FEEDBACK_DRAFT_TTL_MS = 72 * 60 * 60 * 1000; // 72h

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
  userId: string | null,
): FeedbackDraft | null {
  if (!isBrowser()) return null;
  const payload: FeedbackDraft = { ...draft, savedAt: Date.now() };
  try {
    localStorage.setItem(feedbackDraftKey(userId), JSON.stringify(payload));
    return payload;
  } catch (err) {
    // Quota exceeded (e.g. very large screenshot) or storage disabled.
    // Surface to console so beta testers see it; do not throw.
    console.error('feedback-draft: failed to save draft', err);
    return null;
  }
}

// Removes the v1 entry and every other fan's expired or unreadable draft. A
// draft is otherwise removed only when its own fan loads it, so one who never
// returns would leave it (screenshot included) in storage for good.
function sweepDrafts(now: number, ownKey: string): void {
  try {
    localStorage.removeItem(LEGACY_FEEDBACK_DRAFT_KEY);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && key !== ownKey && key.startsWith(FEEDBACK_DRAFT_KEY))
        keys.push(key);
    }
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      let parsed: unknown = null;
      try {
        parsed = raw === null ? null : JSON.parse(raw);
      } catch {
        parsed = null;
      }
      if (
        !isStoredDraft(parsed) ||
        now - parsed.savedAt > FEEDBACK_DRAFT_TTL_MS
      )
        localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('feedback-draft: failed to sweep old drafts', err);
  }
}

export function loadDraft(
  userId: string | null,
  now: number = Date.now(),
): FeedbackDraft | null {
  if (!isBrowser()) return null;
  const key = feedbackDraftKey(userId);
  sweepDrafts(now, key);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredDraft(parsed)) {
      // Corrupt or schema-drifted entry — clear to avoid sticky bad state.
      localStorage.removeItem(key);
      return null;
    }
    if (now - parsed.savedAt > FEEDBACK_DRAFT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return {
      ...parsed,
      // A draft from before the message cap, or an edited one, would fail
      // every send with a 422 the fan cannot see the reason for.
      message: parsed.message.slice(0, MAX_FEEDBACK_MESSAGE_LENGTH),
      venueName: parsed.venueName ?? '',
      website: parsed.website ?? '',
    };
  } catch (err) {
    // JSON.parse threw (truncated/invalid payload) or some other read
    // failure. Purge the bad entry so reopening the modal doesn't log
    // the same error indefinitely (#834 Copilot R2).
    console.error('feedback-draft: failed to load draft', err);
    try {
      localStorage.removeItem(key);
    } catch (removeErr) {
      console.warn('feedback-draft: failed to purge corrupt entry', removeErr);
    }
    return null;
  }
}

export function clearDraft(userId: string | null): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(feedbackDraftKey(userId));
  } catch (err) {
    console.error('feedback-draft: failed to clear draft', err);
  }
}
