import { describe, expect, it } from 'vitest'
import { httpUrl } from './url-schema.js'

describe('httpUrl', () => {
  it.each([
    'javascript:alert(document.cookie)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('rejects %s', (url) => {
    expect(httpUrl().safeParse(url).success).toBe(false)
  })

  it.each(['https://example.com/show', 'http://example.com'])(
    'accepts %s',
    (url) => {
      expect(httpUrl().safeParse(url).success).toBe(true)
    },
  )

  it('rejects a non-URL string', () => {
    expect(httpUrl().safeParse('not a url').success).toBe(false)
  })

  it('enforces the max length when one is given', () => {
    const long = `https://example.com/${'a'.repeat(500)}`
    expect(httpUrl(500).safeParse(long).success).toBe(false)
    expect(httpUrl().safeParse(long).success).toBe(true)
  })
})
