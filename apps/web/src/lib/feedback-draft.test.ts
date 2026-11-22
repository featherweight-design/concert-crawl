// @vitest-environment jsdom

import { beforeEach, describe, it, expect } from 'vitest';
import { MAX_FEEDBACK_MESSAGE_LENGTH } from '@concert-crawl/types';
import {
  FEEDBACK_DRAFT_KEY,
  FEEDBACK_DRAFT_TTL_MS,
  LEGACY_FEEDBACK_DRAFT_KEY,
  clearDraft,
  feedbackDraftKey,
  loadDraft,
  saveDraft,
} from './feedback-draft';

// A draft of any kind but Suggest a venue leaves the venue fields empty.
const NO_VENUE = { venueName: '', website: '' };

beforeEach(() => {
  localStorage.clear();
});

describe('saveDraft', () => {
  it('persists a draft to localStorage with a timestamp', () => {
    const result = saveDraft(
      {
        category: 'bug',
        message: 'something is broken',
        screenshot: null,
        ...NO_VENUE,
      },
      null,
    );
    expect(result).not.toBeNull();
    expect(result?.savedAt).toBeGreaterThan(0);

    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY);
    expect(raw).not.toBeNull();
  });
});

describe('loadDraft', () => {
  it('returns null when nothing is saved', () => {
    expect(loadDraft(null)).toBeNull();
  });

  it('round-trips a saved draft', () => {
    saveDraft(
      {
        category: 'idea',
        message: 'add dark mode',
        screenshot: { name: 'foo.png', dataUrl: 'data:image/png;base64,xxx' },
        ...NO_VENUE,
      },
      null,
    );
    const loaded = loadDraft(null);
    expect(loaded?.category).toBe('idea');
    expect(loaded?.message).toBe('add dark mode');
    expect(loaded?.screenshot).toEqual({
      name: 'foo.png',
      dataUrl: 'data:image/png;base64,xxx',
    });
  });

  it('round-trips a venue suggestion with its own fields', () => {
    saveDraft(
      {
        category: 'venue_suggestion',
        message: 'Jazz most nights.',
        screenshot: null,
        venueName: 'Dazzle',
        website: 'dazzledenver.com',
      },
      null,
    );
    expect(loadDraft(null)).toMatchObject({
      category: 'venue_suggestion',
      message: 'Jazz most nights.',
      venueName: 'Dazzle',
      website: 'dazzledenver.com',
    });
  });

  it('loads a draft saved before the venue fields, with them empty', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({
        category: 'bug',
        message: 'old draft',
        screenshot: null,
        savedAt: Date.now(),
      }),
    );
    expect(loadDraft(null)).toMatchObject({
      category: 'bug',
      message: 'old draft',
      venueName: '',
      website: '',
    });
  });

  it('discards drafts older than the TTL', () => {
    const saved = saveDraft(
      {
        category: 'bug',
        message: 'stale',
        screenshot: null,
        ...NO_VENUE,
      },
      null,
    );
    expect(saved).not.toBeNull();
    // Simulate looking up the draft TTL+1ms after it was saved.
    const futureNow = (saved?.savedAt ?? 0) + FEEDBACK_DRAFT_TTL_MS + 1;
    const loaded = loadDraft(null, futureNow);
    expect(loaded).toBeNull();
    // Stale entry should be purged.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it('discards corrupt entries', () => {
    localStorage.setItem(FEEDBACK_DRAFT_KEY, '{not json');
    expect(loadDraft(null)).toBeNull();
    // #834 Copilot R2 — JSON.parse failures used to leave the bad entry in
    // place, causing every modal open to log the same error. Now purged.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it('discards entries that fail schema validation', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({ category: 'invalid', message: 1, savedAt: 'x' }),
    );
    expect(loadDraft(null)).toBeNull();
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });
});

describe('clearDraft', () => {
  it('removes a saved draft', () => {
    saveDraft(
      {
        category: 'praise',
        message: 'great app',
        screenshot: null,
        ...NO_VENUE,
      },
      null,
    );
    clearDraft(null);
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });
});

describe('a signed-in fan keeps their own draft', () => {
  const draft = {
    category: 'idea' as const,
    message: 'mine, not yours',
    screenshot: null,
    ...NO_VENUE,
  };

  it('saves under the user id, never the device-wide key', () => {
    saveDraft(draft, 'user_a');
    expect(localStorage.getItem(feedbackDraftKey('user_a'))).not.toBeNull();
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it('never shows one user the next user’s draft on a shared phone', () => {
    saveDraft(draft, 'user_a');
    expect(loadDraft('user_b')).toBeNull();
    expect(loadDraft(null)).toBeNull();
    expect(loadDraft('user_a')?.message).toBe('mine, not yours');
  });

  it('keeps the signed-out draft on the device-wide key, as before', () => {
    saveDraft(draft, null);
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).not.toBeNull();
    expect(loadDraft('user_a')).toBeNull();
    expect(loadDraft(null)?.message).toBe('mine, not yours');
  });

  it('clears only its own draft', () => {
    saveDraft(draft, 'user_a');
    saveDraft(draft, null);
    clearDraft('user_a');
    expect(loadDraft('user_a')).toBeNull();
    expect(loadDraft(null)).not.toBeNull();
  });
});

describe('old and abandoned drafts', () => {
  const stored = (savedAt: number, message = 'note') =>
    JSON.stringify({ category: 'idea', message, screenshot: null, savedAt });

  // v1 held signed-in drafts on the device-wide key, so a signed-out visitor
  // could have loaded the last fan's note. It is removed and never read.
  it('never loads a v1 entry, and removes it', () => {
    localStorage.setItem(LEGACY_FEEDBACK_DRAFT_KEY, stored(Date.now()));
    expect(loadDraft(null)).toBeNull();
    expect(localStorage.getItem(LEGACY_FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it("sweeps another fan's expired draft and keeps a fresh one", () => {
    const now = Date.now();
    localStorage.setItem(
      feedbackDraftKey('user_old'),
      stored(now - FEEDBACK_DRAFT_TTL_MS - 1),
    );
    localStorage.setItem(feedbackDraftKey('user_fresh'), stored(now));
    localStorage.setItem('unrelated', 'kept');
    loadDraft('user_b', now);
    expect(localStorage.getItem(feedbackDraftKey('user_old'))).toBeNull();
    expect(localStorage.getItem(feedbackDraftKey('user_fresh'))).not.toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('kept');
  });

  it('holds a restored message to the API cap', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      stored(Date.now(), 'x'.repeat(MAX_FEEDBACK_MESSAGE_LENGTH + 50)),
    );
    expect(loadDraft(null)?.message).toHaveLength(MAX_FEEDBACK_MESSAGE_LENGTH);
  });
});
