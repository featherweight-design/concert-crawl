import { describe, it, expect } from 'vitest'
import { isSafeHttpUrl } from './is-safe-http-url'

describe('isSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isSafeHttpUrl('http://example.com')).toBe(true)
    expect(isSafeHttpUrl('https://tickets.example.com/evt/1')).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>1</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'mailto:foo@example.com',
  ])('rejects non-navigational protocol %s', (url) => {
    expect(isSafeHttpUrl(url)).toBe(false)
  })

  it('rejects nullish and unparseable values', () => {
    expect(isSafeHttpUrl(null)).toBe(false)
    expect(isSafeHttpUrl(undefined)).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})
