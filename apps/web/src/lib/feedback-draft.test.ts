// @vitest-environment jsdom

import { beforeEach, describe, it, expect } from 'vitest'
import {
  FEEDBACK_DRAFT_KEY,
  FEEDBACK_DRAFT_TTL_MS,
  clearDraft,
  loadDraft,
  saveDraft,
} from './feedback-draft'

beforeEach(() => {
  localStorage.clear()
})

describe('saveDraft', () => {
  it('persists a draft to localStorage with a timestamp', () => {
    const result = saveDraft({
      category: 'bug',
      message: 'something is broken',
      screenshot: null,
    })
    expect(result).not.toBeNull()
    expect(result?.savedAt).toBeGreaterThan(0)

    const raw = localStorage.getItem(FEEDBACK_DRAFT_KEY)
    expect(raw).not.toBeNull()
  })
})

describe('loadDraft', () => {
  it('returns null when nothing is saved', () => {
    expect(loadDraft()).toBeNull()
  })

  it('round-trips a saved draft', () => {
    saveDraft({
      category: 'idea',
      message: 'add dark mode',
      screenshot: { name: 'foo.png', dataUrl: 'data:image/png;base64,xxx' },
    })
    const loaded = loadDraft()
    expect(loaded?.category).toBe('idea')
    expect(loaded?.message).toBe('add dark mode')
    expect(loaded?.screenshot).toEqual({
      name: 'foo.png',
      dataUrl: 'data:image/png;base64,xxx',
    })
  })

  it('discards drafts older than the TTL', () => {
    const saved = saveDraft({
      category: 'bug',
      message: 'stale',
      screenshot: null,
    })
    expect(saved).not.toBeNull()
    // Simulate looking up the draft TTL+1ms after it was saved.
    const futureNow = (saved?.savedAt ?? 0) + FEEDBACK_DRAFT_TTL_MS + 1
    const loaded = loadDraft(futureNow)
    expect(loaded).toBeNull()
    // Stale entry should be purged.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull()
  })

  it('discards corrupt entries', () => {
    localStorage.setItem(FEEDBACK_DRAFT_KEY, '{not json')
    expect(loadDraft()).toBeNull()
    // #834 Copilot R2 — JSON.parse failures used to leave the bad entry in
    // place, causing every modal open to log the same error. Now purged.
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull()
  })

  it('discards entries that fail schema validation', () => {
    localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({ category: 'invalid', message: 1, savedAt: 'x' }),
    )
    expect(loadDraft()).toBeNull()
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull()
  })
})

describe('clearDraft', () => {
  it('removes a saved draft', () => {
    saveDraft({ category: 'praise', message: 'great app', screenshot: null })
    clearDraft()
    expect(localStorage.getItem(FEEDBACK_DRAFT_KEY)).toBeNull()
  })
})
