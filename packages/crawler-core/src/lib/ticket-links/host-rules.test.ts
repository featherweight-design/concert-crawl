import { describe, expect, it } from 'vitest'
import {
  KNOWN_RESALE_HOSTS,
  KNOWN_VENDOR_HOSTS,
  isResaleHost,
  vendorForHost,
} from './host-rules.js'

describe('KNOWN_VENDOR_HOSTS', () => {
  it('maps ticketmaster.com to Ticketmaster', () => {
    expect(KNOWN_VENDOR_HOSTS.get('ticketmaster.com')).toBe('Ticketmaster')
  })

  it('maps livenation.com to Ticketmaster (Live Nation is the parent company)', () => {
    expect(KNOWN_VENDOR_HOSTS.get('livenation.com')).toBe('Ticketmaster')
  })

  it('maps axs.com to AXS', () => {
    expect(KNOWN_VENDOR_HOSTS.get('axs.com')).toBe('AXS')
  })

  it('maps seatgeek.com to SeatGeek', () => {
    expect(KNOWN_VENDOR_HOSTS.get('seatgeek.com')).toBe('SeatGeek')
  })

  it('maps dice.fm to DICE', () => {
    expect(KNOWN_VENDOR_HOSTS.get('dice.fm')).toBe('DICE')
  })

  it('maps eventbrite.com to Eventbrite', () => {
    expect(KNOWN_VENDOR_HOSTS.get('eventbrite.com')).toBe('Eventbrite')
  })
})

describe('KNOWN_RESALE_HOSTS', () => {
  it('contains stubhub.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('stubhub.com')).toBe(true)
  })

  it('contains vividseats.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('vividseats.com')).toBe(true)
  })

  it('contains viagogo.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('viagogo.com')).toBe(true)
  })

  it('contains ticketnetwork.com', () => {
    expect(KNOWN_RESALE_HOSTS.has('ticketnetwork.com')).toBe(true)
  })

  it('does NOT contain seatgeek.com (SeatGeek is a primary vendor per memory)', () => {
    expect(KNOWN_RESALE_HOSTS.has('seatgeek.com')).toBe(false)
  })
})

describe('vendorForHost', () => {
  it('returns the mapped vendor for a known host', () => {
    expect(vendorForHost('ticketmaster.com')).toBe('Ticketmaster')
  })

  it('returns null for an unknown host', () => {
    expect(vendorForHost('larimerlounge.com')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(vendorForHost(null)).toBeNull()
  })
})

describe('isResaleHost', () => {
  it('returns true for stubhub.com', () => {
    expect(isResaleHost('stubhub.com')).toBe(true)
  })

  it('returns false for ticketmaster.com', () => {
    expect(isResaleHost('ticketmaster.com')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isResaleHost(null)).toBe(false)
  })
})
