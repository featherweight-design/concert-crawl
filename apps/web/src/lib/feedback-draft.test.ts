// @vitest-environment jsdom

import { beforeEach, describe, it, expect } from 'vitest';
import {
  FEEDBACK_DRAFT_KEY,
  FEEDBACK_DRAFT_TTL_MS,
  clearDraft,
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
    const result = saveDraft({
      category: 'bug',
      message: 'something is broken',
      screenshot: null,
      ...NO_VENUE,
    });
    expect(result).not.toBeNull();
    expect(result?.savedAt).toBeGreaterThan(0);

    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY);
    expect(raw).not.toBeNull();
  });
});

describe('loadDraft', () => {
  it('returns null when nothing is saved', () => {
    expect(loadDraft()).toBeNull();
  });

  it('round-trips a saved draft', () => {
    saveDraft({
      category: 'idea',
      message: 'add dark mode',
      screenshot: { name: 'foo.png', dataUrl: 'data:image/png;base64,xxx' },
      ...NO_VENUE,
    });
    const loaded = loadDraft();
    expect(loaded?.category).toBe('idea');
    expect(loaded?.message).toBe('add dark mode');
    expect(loaded?.screenshot).toEqual({
      name: 'foo.png',
      dataUrl: 'data:image/png;base64,xxx',
    });
  });

  it('round-trips a venue suggestion with its own fields', () => {
    saveDraft({
      category: 'venue_suggestion',
      message: 'Jazz most nights.',
      screenshot: null,
      venueName: 'Dazzle',
      website: 'dazzledenver.com',
    });
    expect(loadDraft()).toMatchObject({
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
    expect(loadDraft()).toMatchObject({
      category: 'bug',
      message: 'old draft',
      venueName: '',
      website: '',
    });
  });

  it('discards drafts older than the TTL', () => {
    const saved = saveDraft({
      category: 'bug',
      message: 'stale',
      screenshot: null,
      ...NO_VENUE,
    });
    expect(saved).not.toBeNull();
    // Simulate looking up the draft TTL+1ms after it was saved.
    const futureNow = (saved?.savedAt ?? 0) + FEEDBACK_DRAFT_TTL_MS + 1;
    const loaded = loadDraft(futureNow);
    expect(loaded).toBeNull();
    // Stale entry should be purged.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it('discards corrupt entries', () => {
    localStorage.setItem(FEEDBACK_DRAFT_KEY, '{not json');
    expect(loadDraft()).toBeNull();
    // #834 Copilot R2 — JSON.parse failures used to leave the bad entry in
    // place, causing every modal open to log the same error. Now purged.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });

  it('discards entries that fail schema validation', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({ category: 'invalid', message: 1, savedAt: 'x' }),
    );
    expect(loadDraft()).toBeNull();
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });
});

describe('clearDraft', () => {
  it('removes a saved draft', () => {
    saveDraft({
      category: 'praise',
      message: 'great app',
      screenshot: null,
      ...NO_VENUE,
    });
    clearDraft();
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull();
  });
});
