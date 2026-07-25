import { describe, it, expect } from 'vitest'
import {
  cleanHtml,
  resolveExtractedUrl,
  MAX_INPUT_HTML_CHARS,
} from './clean-html.js'

const SOURCE_URL = 'https://www.redrocksonline.com/events/'

describe('cleanHtml', () => {
  it('removes script, style, nav and footer content', () => {
    const { text } = cleanHtml(
      `<html><head><style>.a{color:red}</style><script>var x=1</script></head>
       <nav><a href="/about">About</a></nav>
       <main>GRiZ</main>
       <footer><a href="/privacy">Privacy</a></footer></html>`,
      SOURCE_URL,
    )

    expect(text).toContain('GRiZ')
    expect(text).not.toContain('color:red')
    expect(text).not.toContain('var x=1')
    expect(text).not.toContain('About')
    expect(text).not.toContain('Privacy')
  })

  it('does not collect link URLs from nav or footer', () => {
    const { linkUrls } = cleanHtml(
      `<nav><a href="/about">About</a></nav>
       <footer><a href="/privacy">Privacy</a></footer>
       <a href="/events/griz-1489047/">GRiZ</a>`,
      SOURCE_URL,
    )

    expect([...linkUrls]).toEqual([
      'https://www.redrocksonline.com/events/griz-1489047/',
    ])
  })

  it('inlines each anchor href next to its link text', () => {
    const { text } = cleanHtml(
      '<a href="/events/griz-1489047/"><h3>GRiZ</h3></a>',
      SOURCE_URL,
    )

    expect(text).toBe(
      '[link: https://www.redrocksonline.com/events/griz-1489047/] GRiZ',
    )
  })

  it('resolves relative, root-relative and protocol-relative hrefs', () => {
    const { linkUrls } = cleanHtml(
      `<a href="griz-1489047/">a</a>
       <a href="/events/phish/">b</a>
       <a href="//www.axs.com/events/1489047/">c</a>`,
      SOURCE_URL,
    )

    expect([...linkUrls]).toEqual([
      'https://www.redrocksonline.com/events/griz-1489047/',
      'https://www.redrocksonline.com/events/phish/',
      'https://www.axs.com/events/1489047/',
    ])
  })

  it('accepts single-quoted and unquoted href attributes', () => {
    const { linkUrls } = cleanHtml(
      `<a href='/events/one/'>a</a><a href=/events/two/ class="x">b</a>`,
      SOURCE_URL,
    )

    expect([...linkUrls]).toEqual([
      'https://www.redrocksonline.com/events/one/',
      'https://www.redrocksonline.com/events/two/',
    ])
  })

  it('decodes HTML entities in hrefs', () => {
    const { linkUrls } = cleanHtml(
      '<a href="https://www.axs.com/events/1489047/griz-tickets?skin=redrocks&amp;utm=cal">GRiZ</a>',
      SOURCE_URL,
    )

    expect([...linkUrls]).toEqual([
      'https://www.axs.com/events/1489047/griz-tickets?skin=redrocks&utm=cal',
    ])
  })

  it('drops non-http(s) and fragment-only hrefs without emitting a marker', () => {
    const { text, linkUrls } = cleanHtml(
      `<a href="javascript:void(0)">a</a>
       <a href="mailto:box@venue.com">b</a>
       <a href="#main">c</a>
       <a href="">d</a>
       <a>e</a>`,
      SOURCE_URL,
    )

    expect(linkUrls.size).toBe(0)
    expect(text).not.toContain('[link:')
  })

  it('deduplicates repeated hrefs in the collected set', () => {
    const { linkUrls } = cleanHtml(
      `<a href="/events/griz-1489047/">image</a><a href="/events/griz-1489047/">title</a>`,
      SOURCE_URL,
    )

    expect(linkUrls.size).toBe(1)
  })

  it('collapses whitespace and truncates to the input cap', () => {
    const { text } = cleanHtml(
      `<p>a</p>\n\n\n   <p>${'b'.repeat(300_000)}</p>`,
      SOURCE_URL,
    )

    expect(text.startsWith('a b')).toBe(true)
    expect(text.length).toBe(200_000)
  })

  it('rejects a scheme hidden behind a numeric entity', () => {
    const { text, linkUrls } = cleanHtml(
      '<a href="javascript&#58;alert(1)">GRiZ</a>' +
        "<a href='mailto&#x3A;box@venue.com'>email</a>",
      SOURCE_URL,
    )

    expect(text).not.toContain('[link')
    expect(linkUrls.size).toBe(0)
  })

  it('ignores a hyphen-prefixed attribute that ends in href', () => {
    const { text, linkUrls } = cleanHtml(
      '<a data-href="/framework/route/">GRiZ</a>',
      SOURCE_URL,
    )

    expect(text).not.toContain('[link')
    expect(linkUrls.size).toBe(0)
  })

  it('reads href when a hyphen-prefixed lookalike precedes it', () => {
    const { linkUrls } = cleanHtml(
      '<a data-href="/framework/route/" href="/events/griz/">GRiZ</a>',
      SOURCE_URL,
    )

    expect([...linkUrls]).toEqual([
      'https://www.redrocksonline.com/events/griz/',
    ])
  })

  it('excludes links that fall past the truncation cap', () => {
    const { text, linkUrls } = cleanHtml(
      `<a href="/events/early/">early</a><p>${'b'.repeat(300_000)}</p>
       <a href="/events/late/">late</a>`,
      SOURCE_URL,
    )

    expect(text).not.toContain('/events/late/')
    expect([...linkUrls]).toEqual([
      'https://www.redrocksonline.com/events/early/',
    ])
  })

  it('drops a marker the truncation cap sliced in half', () => {
    const { text, linkUrls } = cleanHtml(
      `<p>${'b'.repeat(MAX_INPUT_HTML_CHARS - 10)}</p><a href="/events/griz/">GRiZ</a>`,
      SOURCE_URL,
    )

    expect(text).not.toContain('[link')
    expect(text.length).toBeLessThanOrEqual(MAX_INPUT_HTML_CHARS)
    expect(linkUrls.size).toBe(0)
  })

  it('tolerates an unparseable source URL by dropping relative links', () => {
    const { linkUrls } = cleanHtml(
      '<a href="/events/griz/">a</a><a href="https://www.axs.com/e/1">b</a>',
      'not a url',
    )

    expect([...linkUrls]).toEqual(['https://www.axs.com/e/1'])
  })
})

describe('resolveExtractedUrl', () => {
  const linkUrls = new Set([
    'https://www.redrocksonline.com/events/griz-1489047/',
    'https://www.axs.com/events/1489047/griz-tickets?skin=redrocks',
  ])

  it('returns a URL the page actually linked to', () => {
    expect(
      resolveExtractedUrl(
        'https://www.redrocksonline.com/events/griz-1489047/',
        linkUrls,
      ),
    ).toBe('https://www.redrocksonline.com/events/griz-1489047/')
  })

  it('matches despite host casing and trims surrounding whitespace', () => {
    expect(
      resolveExtractedUrl(
        '  https://WWW.RedRocksOnline.com/events/griz-1489047/  ',
        linkUrls,
      ),
    ).toBe('https://www.redrocksonline.com/events/griz-1489047/')
  })

  it('drops a URL the page never linked to', () => {
    expect(
      resolveExtractedUrl(
        'https://www.redrocksonline.com/events/hallucinated-show/',
        linkUrls,
      ),
    ).toBeNull()
  })

  it('drops null, empty and non-http values', () => {
    expect(resolveExtractedUrl(null, linkUrls)).toBeNull()
    expect(resolveExtractedUrl('   ', linkUrls)).toBeNull()
    expect(resolveExtractedUrl('javascript:alert(1)', linkUrls)).toBeNull()
  })
})
