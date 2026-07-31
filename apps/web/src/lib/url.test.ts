import { describe, expect, it } from 'vitest'
import { isHttpUrl } from './url'

describe('isHttpUrl', () => {
  it.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'mailto:someone@example.com',
    'not a url',
    '',
  ])('returns false for %s', (url) => {
    expect(isHttpUrl(url)).toBe(false)
  })

  it.each(['https://example.com/show', 'http://example.com'])(
    'returns true for %s',
    (url) => {
      expect(isHttpUrl(url)).toBe(true)
    },
  )
})
