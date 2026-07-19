import { describe, it, expect } from 'vitest'
import {
  BUCKET_LABELS,
  bucketForGenre,
  bucketsPresentIn,
  expandBucket,
  isGenreBucket,
} from './genre-buckets.js'

describe('BUCKET_LABELS', () => {
  it('is sorted alphabetically for stable UI ordering', () => {
    const sorted = [...BUCKET_LABELS].sort()
    expect(BUCKET_LABELS).toEqual(sorted)
  })

  it('includes the core music buckets plus comedy', () => {
    // Comedy is in the taxonomy because #1101 promised it and Denver
    // venues do book comedy — dropping it would hide those events from
    // the filter surface entirely.
    expect(BUCKET_LABELS).toEqual(
      expect.arrayContaining([
        'classical',
        'comedy',
        'country',
        'electronic',
        'folk',
        'hip-hop',
        'indie',
        'jam',
        'jazz',
        'latin',
        'metal',
        'pop',
        'punk',
        'reggae',
        'rock',
        'world',
      ]),
    )
  })
})

describe('isGenreBucket', () => {
  it('narrows string to GenreBucket for canonical labels', () => {
    expect(isGenreBucket('rock')).toBe(true)
    expect(isGenreBucket('electronic')).toBe(true)
    expect(isGenreBucket('comedy')).toBe(true)
  })

  it('returns false for non-buckets (sub-genres, long-tail, empty)', () => {
    expect(isGenreBucket('dubstep')).toBe(false)
    expect(isGenreBucket('ceremony')).toBe(false)
    expect(isGenreBucket('Rock')).toBe(false)
    expect(isGenreBucket('')).toBe(false)
  })
})

describe('bucketForGenre', () => {
  it('maps a genre to its bucket', () => {
    expect(bucketForGenre('rock')).toBe('rock')
    expect(bucketForGenre('dubstep')).toBe('electronic')
    expect(bucketForGenre('rap')).toBe('hip-hop')
    expect(bucketForGenre('metalcore')).toBe('metal')
    expect(bucketForGenre('reggaeton')).toBe('latin')
    expect(bucketForGenre('bluegrass')).toBe('folk')
    expect(bucketForGenre('comedy')).toBe('comedy')
  })

  it('is case-insensitive so LLM drift (Americana vs americana) still maps', () => {
    expect(bucketForGenre('Americana')).toBe('folk')
    expect(bucketForGenre('americana')).toBe('folk')
    expect(bucketForGenre('K-POP')).toBe('pop')
  })

  it('trims surrounding whitespace before lookup', () => {
    expect(bucketForGenre('  rock  ')).toBe('rock')
  })

  it('returns null for unknown / long-tail genres', () => {
    expect(bucketForGenre('ceremony')).toBeNull()
    expect(bucketForGenre('<UNKNOWN>')).toBeNull()
    expect(bucketForGenre('some-brand-new-thing')).toBeNull()
    expect(bucketForGenre('')).toBeNull()
  })
})

describe('expandBucket', () => {
  it('expands a bucket to its full sub-genre list', () => {
    const electronic = expandBucket('electronic')
    expect(electronic).toEqual(
      expect.arrayContaining(['electronic', 'house', 'dubstep', 'bass']),
    )
    expect(electronic.length).toBeGreaterThan(5)
  })

  it('includes the bucket label itself so raw "rock"-tagged rows still match', () => {
    expect(expandBucket('rock')).toContain('rock')
    expect(expandBucket('hip-hop')).toContain('hip-hop')
  })

  it('includes both case variants where LLM drift produced them (Americana / americana, k-pop / K-POP)', () => {
    // SQL overlap is exact-string, so BOTH case variants must live in the
    // bucket source list — case-insensitive bucketForGenre isn't enough to
    // make filterVibe=folk match a row tagged 'Americana' (or vice versa).
    const folk = expandBucket('folk')
    expect(folk).toContain('Americana')
    expect(folk).toContain('americana')
    const pop = expandBucket('pop')
    expect(pop).toContain('k-pop')
    expect(pop).toContain('K-POP')
  })

  it('returns the input as a single-element array for unknown buckets (back-compat)', () => {
    expect(expandBucket('some-brand-new-thing')).toEqual([
      'some-brand-new-thing',
    ])
    expect(expandBucket('ceremony')).toEqual(['ceremony'])
  })

  it('bucket lookup is case-insensitive so ?filterVibe=Rock still expands to the rock bucket', () => {
    // Case-normalised bucket resolution keeps the URL surface tolerant to
    // user typing / hand-edited bookmarks, without normalising the raw
    // fallback path (a truly unknown value passes through byte-for-byte).
    expect(expandBucket('Rock')).toContain('alternative')
    expect(expandBucket('Rock')).toContain('rock')
  })

  it('preserves the exact input for the back-compat fallback so overlap match hits raw rows', () => {
    // A bookmarked ?filterVibe=dubstep from before this shipped stays
    // narrow — the DB row is tagged literally 'dubstep', and the SQL
    // overlap operator does exact string match. If we normalised the
    // fallback to lowercase, a hypothetical ?filterVibe=Dubstep bookmark
    // would still not spuriously match anything else, but preserving the
    // input keeps the behaviour predictable and 1:1 with the wire value.
    expect(expandBucket('dubstep')).toEqual(['dubstep'])
    expect(expandBucket('ceremony')).toEqual(['ceremony'])
  })
})

describe('bucketsPresentIn', () => {
  it('returns sorted bucket labels for the given raw genres', () => {
    const raw = ['rock', 'indie', 'dubstep', 'jazz', 'ceremony']
    expect(bucketsPresentIn(raw)).toEqual([
      'electronic',
      'indie',
      'jazz',
      'rock',
    ])
  })

  it('dedupes buckets even when many sub-genres map to the same bucket', () => {
    // These are all electronic sub-genres — the result should be just one entry.
    expect(bucketsPresentIn(['house', 'dubstep', 'bass', 'techno'])).toEqual([
      'electronic',
    ])
  })

  it('drops raw genres that have no bucket mapping', () => {
    expect(bucketsPresentIn(['<UNKNOWN>', 'ceremony', 'film'])).toEqual([])
  })

  it('is case-insensitive on the input', () => {
    expect(bucketsPresentIn(['Rock', 'INDIE', 'Americana'])).toEqual([
      'folk',
      'indie',
      'rock',
    ])
  })
})
