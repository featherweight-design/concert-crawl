// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  buildNotificationOptions,
  isValidPushPayload,
  safeSameOriginPath,
} from '../push-notification'

const ORIGIN = 'https://concertcrawl.app'
const base = { title: 'Marian Hill', body: 'new Denver date' }

describe('isValidPushPayload', () => {
  it('accepts a payload with and without the silent flag', () => {
    expect(isValidPushPayload(base)).toBe(true)
    expect(isValidPushPayload({ ...base, silent: true })).toBe(true)
  })

  // A non-boolean here would reach showNotification unchecked.
  it('rejects a non-boolean silent', () => {
    expect(isValidPushPayload({ ...base, silent: 'yes' })).toBe(false)
  })
})

describe('buildNotificationOptions', () => {
  // The whole point of the payload flag: artist.new_show rides the 3 AM
  // crawl, so it must post to the shade without making a sound. If this
  // mapping is dropped the sender's policy ships inert and nobody finds out.
  it('passes silent through when the sender asked for it', () => {
    expect(
      buildNotificationOptions({ ...base, silent: true }, ORIGIN).silent,
    ).toBe(true)
  })

  // Absent rather than `false` — Chrome rejects silent alongside a vibrate
  // pattern, so an explicit false would foreclose adding one later.
  it('omits silent entirely when the sender did not', () => {
    const options = buildNotificationOptions(base, ORIGIN)
    expect('silent' in options).toBe(false)
  })

  it('keeps a same-origin actionUrl as a path', () => {
    const options = buildNotificationOptions(
      { ...base, actionUrl: `${ORIGIN}/events/abc?x=1` },
      ORIGIN,
    )
    expect(options.data).toEqual({ actionUrl: '/events/abc?x=1' })
  })

  it('drops a cross-origin actionUrl to the home route', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const options = buildNotificationOptions(
      { ...base, actionUrl: 'https://evil.example/steal' },
      ORIGIN,
    )
    expect(options.data).toEqual({ actionUrl: '/' })
  })
})

describe('safeSameOriginPath', () => {
  it('falls back to the home route on junk', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(safeSameOriginPath(undefined, ORIGIN)).toBe('/')
    expect(safeSameOriginPath('', ORIGIN)).toBe('/')
    expect(safeSameOriginPath(42, ORIGIN)).toBe('/')
  })
})
