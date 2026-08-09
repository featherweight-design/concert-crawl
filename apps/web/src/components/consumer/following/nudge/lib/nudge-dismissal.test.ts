// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isFollowNudgeAnswered,
  markFollowNudgeAnswered,
} from './nudge-dismissal'

const KEY = 'cc-nf-nudge-answered'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('follow nudge dismissal', () => {
  it('reports an unseen row as unanswered', () => {
    expect(isFollowNudgeAnswered('ue-1')).toBe(false)
  })

  it('remembers an answered row', () => {
    markFollowNudgeAnswered('ue-1')
    expect(isFollowNudgeAnswered('ue-1')).toBe(true)
  })

  // ⚠️ REGRESSION (#70 class). The record is keyed by the watch ROW, so a
  // different row for the same show is a different question. If this ever
  // starts keying on eventId, un-watching and re-watching a show the user
  // dismissed once would never offer the follow again.
  it('does not carry an answer across to another row', () => {
    markFollowNudgeAnswered('ue-1')
    expect(isFollowNudgeAnswered('ue-2')).toBe(false)
  })

  it('keeps earlier answers when a later one is recorded', () => {
    markFollowNudgeAnswered('ue-1')
    markFollowNudgeAnswered('ue-2')
    expect(isFollowNudgeAnswered('ue-1')).toBe(true)
    expect(isFollowNudgeAnswered('ue-2')).toBe(true)
  })

  it('treats an unreadable store as empty rather than throwing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(KEY, 'not json')
    expect(isFollowNudgeAnswered('ue-1')).toBe(false)
  })

  it('rejects a store whose values are not the recorded shape', () => {
    localStorage.setItem(KEY, JSON.stringify(['ue-1']))
    expect(isFollowNudgeAnswered('ue-1')).toBe(false)
  })

  it('swallows a write failure so the click handler still completes', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(() => markFollowNudgeAnswered('ue-1')).not.toThrow()
  })
})
