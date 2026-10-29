import { describe, expect, it } from 'vitest'
import type { CaptureResult } from 'posthog-js'
import {
  redactAnalyticsString,
  redactCapture,
  redactElementsChain,
} from './redact'

const TOKEN = 'cinv_9f8e7d6c5b4a'

const event = (overrides: Partial<CaptureResult> = {}): CaptureResult => ({
  uuid: 'u1',
  event: '$pageview',
  properties: {},
  ...overrides,
})

describe('redactAnalyticsString', () => {
  it('redacts an invite token in a path and keeps the rest legible', () => {
    expect(redactAnalyticsString(`/crew/join/${TOKEN}`)).toBe(
      '/crew/join/[redacted]',
    )
  })

  it('drops the query string and fragment of an absolute URL', () => {
    expect(
      redactAnalyticsString(
        'https://concertcrawl.app/search?q=typed+text&__clerk_handshake=jwt#top',
      ),
    ).toBe('https://concertcrawl.app/search')
  })

  it('drops the query string of a root-relative path', () => {
    expect(redactAnalyticsString('/search?q=private-text')).toBe('/search')
  })

  it('cuts a URL at its first ? or #, past any apostrophe', () => {
    expect(
      redactAnalyticsString(
        "https://concertcrawl.app/events#q=O'Reilly-private",
      ),
    ).toBe('https://concertcrawl.app/events')
    expect(redactAnalyticsString("/events?search=O'Reilly-private")).toBe(
      '/events',
    )
  })

  it('leaves plain text alone, a question mark included', () => {
    expect(redactAnalyticsString('Buy tickets')).toBe('Buy tickets')
    expect(redactAnalyticsString('Going? and/or maybe?')).toBe(
      'Going? and/or maybe?',
    )
  })
})

describe('redactElementsChain', () => {
  it('redacts each attribute value and keeps the chain intact', () => {
    expect(
      redactElementsChain(
        `a:attr__href="/crew/join/${TOKEN}"href="/crew/join/${TOKEN}"nth-child="1"text="Join";div:nth-child="2"`,
      ),
    ).toBe(
      'a:attr__href="/crew/join/[redacted]"href="/crew/join/[redacted]"nth-child="1"text="Join";div:nth-child="2"',
    )
  })

  it('drops URL queries in single and double-quoted text alike, apostrophes included', () => {
    expect(
      redactElementsChain(
        `a:href="/events?search=O'Reilly-private"text="O'Reilly";a:href="https://concertcrawl.app/search?q=x#y"`,
      ),
    ).toBe(
      `a:href="/events"text="O'Reilly";a:href="https://concertcrawl.app/search"`,
    )
  })

  it('keeps an escaped quote inside a value', () => {
    expect(redactElementsChain('button:text="Say \\"hi\\""')).toBe(
      'button:text="Say \\"hi\\""',
    )
  })
})

describe('redactCapture', () => {
  it('passes null through', () => {
    expect(redactCapture(null)).toBeNull()
  })

  it('redacts the invite route from every URL property of a pageview', () => {
    const url = `https://concertcrawl.app/crew/join/${TOKEN}`
    const out = redactCapture(
      event({
        properties: {
          $current_url: url,
          $pathname: `/crew/join/${TOKEN}`,
          $referrer: url,
        },
        $set_once: { $initial_current_url: url },
        $set: { $current_url: url },
      }),
    )
    expect(JSON.stringify(out)).not.toContain(TOKEN)
    expect(out?.properties['$current_url']).toBe(
      'https://concertcrawl.app/crew/join/[redacted]',
    )
    expect(out?.properties['$pathname']).toBe('/crew/join/[redacted]')
  })

  it('redacts an autocaptured link to the invite route', () => {
    const out = redactCapture(
      event({
        event: '$autocapture',
        properties: {
          $elements_chain: `a:attr__href="/crew/join/${TOKEN}"text="Join"`,
          $elements: [
            {
              tag_name: 'a',
              attr__href: `/crew/join/${TOKEN}`,
              $el_text: 'Join',
            },
          ],
        },
      }),
    )
    expect(JSON.stringify(out)).not.toContain(TOKEN)
    expect(out?.properties['$elements_chain']).toBe(
      'a:attr__href="/crew/join/[redacted]"text="Join"',
    )
    expect(out?.properties['$elements'][0]['$el_text']).toBe('Join')
  })

  it('keeps non-string values and the event identity', () => {
    const out = redactCapture(
      event({ properties: { count: 3, flag: true, none: null } }),
    )
    expect(out).toMatchObject({
      uuid: 'u1',
      event: '$pageview',
      properties: { count: 3, flag: true, none: null },
    })
  })
})
