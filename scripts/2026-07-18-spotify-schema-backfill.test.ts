import { describe, it, expect } from 'vitest'
import {
  planFollowBackfill,
  planSupportingBackfill,
} from './2026-07-18-spotify-schema-backfill-helpers.js'

describe('planFollowBackfill', () => {
  it('maps artistName → canonicalName, skipping already-canonical rows', () => {
    const rows = [
      { id: 'a', artistName: 'Earl Sweatshirt & MIKE', canonicalName: '' },
      { id: 'b', artistName: 'MIKE', canonicalName: 'mike' },
    ]
    expect(planFollowBackfill(rows)).toEqual([
      { id: 'a', canonicalName: 'earl sweatshirt' },
    ])
  })

  it('re-plans a row whose stored canonicalName drifted from the JS transform', () => {
    const rows = [{ id: 'c', artistName: 'MIKE', canonicalName: 'stale' }]
    expect(planFollowBackfill(rows)).toEqual([
      { id: 'c', canonicalName: 'mike' },
    ])
  })

  it('returns an empty plan for empty input', () => {
    expect(planFollowBackfill([])).toEqual([])
  })
})

describe('planSupportingBackfill', () => {
  it('canonicalizes + dedupes supporting arrays, skipping null/backfilled rows', () => {
    const rows = [
      {
        id: 'e1',
        supportingArtists: ['MIKE', 'MIKE w/ band'],
        canonicalSupporting: null,
      },
      { id: 'e2', supportingArtists: null, canonicalSupporting: null },
      { id: 'e3', supportingArtists: ['X'], canonicalSupporting: ['x'] },
    ]
    expect(planSupportingBackfill(rows)).toEqual([
      { id: 'e1', canonicalSupporting: ['mike'] },
    ])
  })

  it('plans an empty array for rows whose supporting artists all canonicalize away', () => {
    const rows = [
      { id: 'e4', supportingArtists: ['   '], canonicalSupporting: null },
    ]
    expect(planSupportingBackfill(rows)).toEqual([
      { id: 'e4', canonicalSupporting: [] },
    ])
  })

  it('returns an empty plan for empty input', () => {
    expect(planSupportingBackfill([])).toEqual([])
  })
})
