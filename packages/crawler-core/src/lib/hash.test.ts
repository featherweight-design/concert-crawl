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
    artist: 'Metallica',
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

  it('avoids field boundary collisions (delimiter)', () => {
    // Without a delimiter, 'ab'+'c' would hash the same as 'a'+'bc'
    const a = hashEvent({ ...base, title: 'ab', artist: 'c' })
    const b = hashEvent({ ...base, title: 'a', artist: 'bc' })
    expect(a).not.toBe(b)
  })
})
