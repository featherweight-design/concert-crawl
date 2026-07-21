import { describe, it, expect } from 'vitest'
import { isSafeHttpUrl } from './is-safe-http-url'

describe('isSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isSafeHttpUrl('http://example.com')).toBe(true)
    expect(isSafeHttpUrl('https://tickets.example.com/evt/1')).toBe(true)
  })

  it('rejects non-navigational protocols', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,<script>1</script>')).toBe(false)
    expect(isSafeHttpUrl('mailto:foo@example.com')).toBe(false)
  })

  it('rejects null and unparseable values', () => {
    expect(isSafeHttpUrl(null)).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})
