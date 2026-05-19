import { describe, it, expect } from 'vitest'
import { deriveBulkVisibility } from './venue-table-bulk'
import type { VenueWithEventCount } from '@concert-crawl/types'

function makeVenue(
  overrides: Partial<VenueWithEventCount>,
): VenueWithEventCount {
  return {
    id: 'v1',
    name: 'Test Venue',
    slug: 'test-venue',
    websiteUrl: 'https://example.com',
    city: 'Denver',
    timezone: 'America/Denver',
    active: true,
    verified: false,
    verifiedBy: null,
    verifiedAt: null,
    blockedAt: null,
    robotsTxtAllowed: null,
    robotsTxtCheckedAt: null,
    crawlNotes: null,
    crawlDelayMs: 3000,
    crawlWaitUntil: 'networkidle' as const,
    crawlWaitForSelector: null,
    extractionStrategy: null,
    contactEmail: null,
    priceUrl: null,
    ticketVendor: null,
    crawlMode: null,
    address: null,
    capacity: null,
    venueType: null,
    about: null,
    consecutiveFailures: 0,
    lastCrawledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    eventCount: 0,
    ...overrides,
  }
}

describe('deriveBulkVisibility', () => {
  it('shows Verify when any selected venue is unverified', () => {
    const venues = [makeVenue({ verified: false })]
    expect(deriveBulkVisibility(venues).showVerify).toBe(true)
  })

  it('hides Verify when all selected venues are verified', () => {
    const venues = [makeVenue({ verified: true })]
    expect(deriveBulkVisibility(venues).showVerify).toBe(false)
  })

  it('shows Unverify when any selected venue is verified', () => {
    const venues = [makeVenue({ verified: true })]
    expect(deriveBulkVisibility(venues).showUnverify).toBe(true)
  })

  it('hides Unverify when no selected venues are verified', () => {
    const venues = [makeVenue({ verified: false })]
    expect(deriveBulkVisibility(venues).showUnverify).toBe(false)
  })

  it('shows Activate when any selected venue is inactive', () => {
    const venues = [makeVenue({ active: false })]
    expect(deriveBulkVisibility(venues).showActivate).toBe(true)
  })

  it('hides Activate when all selected venues are already active', () => {
    const venues = [makeVenue({ active: true })]
    expect(deriveBulkVisibility(venues).showActivate).toBe(false)
  })

  it('shows Deactivate when any selected venue is active', () => {
    const venues = [makeVenue({ active: true })]
    expect(deriveBulkVisibility(venues).showDeactivate).toBe(true)
  })

  it('hides Deactivate when no selected venues are active', () => {
    const venues = [makeVenue({ active: false })]
    expect(deriveBulkVisibility(venues).showDeactivate).toBe(false)
  })

  it('shows both Activate and Deactivate for mixed-state selection', () => {
    const venues = [
      makeVenue({ active: true }),
      makeVenue({ id: 'v2', active: false }),
    ]
    const result = deriveBulkVisibility(venues)
    expect(result.showActivate).toBe(true)
    expect(result.showDeactivate).toBe(true)
  })

  it('shows both Verify and Unverify for mixed-verified selection', () => {
    const venues = [
      makeVenue({ verified: true }),
      makeVenue({ id: 'v2', verified: false }),
    ]
    const result = deriveBulkVisibility(venues)
    expect(result.showVerify).toBe(true)
    expect(result.showUnverify).toBe(true)
  })
})
