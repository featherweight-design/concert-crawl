import { describe, it, expect } from 'vitest'
import { hashPage, hashEvent } from './hash.js'

describe('hashPage', () => {
  it('returns a 64-character hex string', () => {
    const result = hashPage('<html><body>hello</body></html>')
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', () => {
    const html = '<html><body>hello</body></html>'
    expect(hashPage(html)).toBe(hashPage(html))
  })

  it('strips <script> blocks before hashing', () => {
    const withScript =
      '<html><script>let x = Math.random()</script><body>events</body></html>'
    const withoutScript = '<html><body>events</body></html>'
    expect(hashPage(withScript)).toBe(hashPage(withoutScript))
  })

  it('strips <style> blocks before hashing', () => {
    const withStyle =
      '<html><style>.btn { color: red }</style><body>events</body></html>'
    const withoutStyle = '<html><body>events</body></html>'
    expect(hashPage(withStyle)).toBe(hashPage(withoutStyle))
  })

  it('produces different hashes for different content', () => {
    expect(hashPage('<body>event A</body>')).not.toBe(
      hashPage('<body>event B</body>'),
    )
  })
})

describe('hashEvent', () => {
  const base = {
    title: 'Metallica Live',
    date: '2026-08-15',
    doorsTime: '19:00',
    showTime: '20:00',
  }

  it('returns a 64-character hex string', () => {
    expect(hashEvent(base)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', () => {
    expect(hashEvent(base)).toBe(hashEvent(base))
  })

  it('produces different hashes when title changes', () => {
    expect(hashEvent(base)).not.toBe(
      hashEvent({ ...base, title: 'Metallica Unplugged' }),
    )
  })

  it('produces different hashes when date changes', () => {
    expect(hashEvent(base)).not.toBe(hashEvent({ ...base, date: '2026-08-16' }))
  })

  it('treats null and undefined doorsTime identically', () => {
    expect(hashEvent({ ...base, doorsTime: null })).toBe(
      hashEvent({ ...base, doorsTime: undefined }),
    )
  })

  it('treats null and undefined showTime identically', () => {
    expect(hashEvent({ ...base, showTime: null })).toBe(
      hashEvent({ ...base, showTime: undefined }),
    )
  })

  it('ignores artist-only drift across crawls (regression for #825)', () => {
    // The crawler used to include `artist` in the hash, but the LLM picks
    // artist substrings differently across crawls even when the listing did
    // not change — causing false `crawl.verified_event_changed` alerts.
    // hashEvent must only depend on (title, date, doorsTime, showTime).
    const withFullArtist = hashEvent({
      ...base,
      // @ts-expect-error — extra property should be ignored by hashEvent
      artist: 'Metallica',
    })
    const withTrimmedArtist = hashEvent({
      ...base,
      // @ts-expect-error — extra property should be ignored by hashEvent
      artist: 'Metallica (with Pantera)',
    })
    expect(withFullArtist).toBe(withTrimmedArtist)
    // And both must equal the canonical no-artist hash.
    expect(withFullArtist).toBe(hashEvent(base))
  })

  it('avoids field boundary collisions (delimiter)', () => {
    // Without a delimiter, 'ab'+'c' would hash the same as 'a'+'bc'.
    // Exercise the collision-detection contract with two remaining fields
    // (title + date) now that artist is no longer part of the hash.
    const collisionA = hashEvent({ ...base, title: 'ab', date: 'c' })
    const collisionB = hashEvent({ ...base, title: 'a', date: 'bc' })
    expect(collisionA).not.toBe(collisionB)
  })
})
