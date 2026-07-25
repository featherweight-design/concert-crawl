import { describe, it, expect } from 'vitest'
import { isListingPageUrl } from './listing-url.js'

const LISTINGS = [
  'https://www.redrocksonline.com/events/',
  'https://www.redrocksonline.com/',
]

describe('isListingPageUrl', () => {
  it('recognizes the crawled calendar index', () => {
    expect(
      isListingPageUrl('https://www.redrocksonline.com/events/', LISTINGS),
    ).toBe(true)
  })

  it('ignores a trailing slash and host casing difference', () => {
    expect(
      isListingPageUrl('https://WWW.RedRocksOnline.com/events', LISTINGS),
    ).toBe(true)
  })

  it('keeps a per-event page under the same path prefix', () => {
    expect(
      isListingPageUrl(
        'https://www.redrocksonline.com/events/griz-1489047/',
        LISTINGS,
      ),
    ).toBe(false)
  })

  it('keeps an index path that carries per-event query parameters', () => {
    expect(
      isListingPageUrl(
        'https://www.redrocksonline.com/events/?id=1489047',
        LISTINGS,
      ),
    ).toBe(false)
  })

  it('keeps a third-party ticketing URL', () => {
    expect(
      isListingPageUrl(
        'https://www.axs.com/events/1489047/griz-tickets',
        LISTINGS,
      ),
    ).toBe(false)
  })

  it('returns false for null, blank and unparseable candidates', () => {
    expect(isListingPageUrl(null, LISTINGS)).toBe(false)
    expect(isListingPageUrl('   ', LISTINGS)).toBe(false)
    expect(isListingPageUrl('not a url', LISTINGS)).toBe(false)
  })

  it('tolerates null and unparseable entries in the listing set', () => {
    expect(
      isListingPageUrl('https://www.redrocksonline.com/events/', [
        null,
        'not a url',
        'https://www.redrocksonline.com/events/',
      ]),
    ).toBe(true)
  })

  it('does not match a different venue with the same path', () => {
    expect(
      isListingPageUrl('https://www.ogdentheatre.com/events/', LISTINGS),
    ).toBe(false)
  })
})
