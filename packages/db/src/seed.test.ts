import { describe, it, expect } from 'vitest'
import { SEED_VENUES } from '../seed.js'

describe('seed data', () => {
  it('contains at least 5 Denver venues', () => {
    expect(SEED_VENUES.length).toBeGreaterThanOrEqual(5)
  })

  it('every venue has a name, slug, websiteUrl, and city', () => {
    for (const venue of SEED_VENUES) {
      expect(venue.name).toBeTruthy()
      expect(venue.slug).toBeTruthy()
      expect(venue.websiteUrl).toBeTruthy()
      expect(venue.city).toBe('Denver')
    }
  })

  it('slugs are unique', () => {
    const slugs = SEED_VENUES.map((v) => v.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
