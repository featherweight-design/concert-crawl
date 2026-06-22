import { describe, expect, it } from 'vitest'
import { parseHost } from './parse-host.js'

describe('parseHost', () => {
  it('returns the lowercased hostname for a full https URL', () => {
    expect(parseHost('https://Ticketmaster.com/event/123')).toBe(
      'ticketmaster.com',
    )
  })

  it('strips a leading www. subdomain', () => {
    expect(parseHost('https://www.axs.com/events/abc')).toBe('axs.com')
  })

  it('preserves non-www subdomains', () => {
    expect(parseHost('https://tickets.larimerlounge.com/event/42')).toBe(
      'tickets.larimerlounge.com',
    )
  })

  it('returns null for null', () => {
    expect(parseHost(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseHost(undefined)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseHost('')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(parseHost('not a url')).toBeNull()
  })

  it('returns null for a URL with no host (mailto:)', () => {
    expect(parseHost('mailto:tickets@example.com')).toBeNull()
  })
})
