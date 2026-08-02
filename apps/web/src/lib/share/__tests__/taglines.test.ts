import { describe, it, expect } from 'vitest'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  DEFAULT_POSTER_STATE,
  POSTER_STATES,
  isPosterState,
  posterStateLabel,
  posterTagline,
  resolvePosterState,
} from '../taglines'

describe('poster taglines', () => {
  it('ships the three signed-off taglines verbatim', () => {
    expect(posterTagline('going')).toBe(
      'found this one on Concert Crawl. see you in the pit.',
    )
    expect(posterTagline('soldout')).toBe(
      "sold out. now we're all refreshing stubhub at 2am together.",
    )
    expect(posterTagline('drop')).toBe(
      "price dropped. so did my dignity, but that's unrelated.",
    )
  })

  it('is total over PosterState', () => {
    for (const state of POSTER_STATES) {
      expect(posterTagline(state)).toBeTruthy()
      expect(posterStateLabel(state)).toBeTruthy()
    }
  })

  it('reads from CONSUMER_COPY, not an inline literal', () => {
    for (const state of POSTER_STATES) {
      expect(posterTagline(state)).toBe(CONSUMER_COPY.share.taglines[state])
      expect(posterStateLabel(state)).toBe(
        CONSUMER_COPY.share.stateLabels[state],
      )
    }
  })

  it('falls back to going for an unknown value narrowed by the guard', () => {
    const unknownValue: string = 'wishlisted'
    // Narrow with the guard — never a cast.
    const state = isPosterState(unknownValue)
      ? unknownValue
      : DEFAULT_POSTER_STATE
    expect(state).toBe('going')
    expect(posterTagline(state)).toBe(posterTagline('going'))
  })
})

describe('resolvePosterState', () => {
  it.each(POSTER_STATES)('passes %s through', (state) => {
    expect(resolvePosterState(state)).toBe(state)
  })

  it.each([undefined, '', 'nope', '__proto__', 'GOING'])(
    'falls back to going for %p',
    (raw) => {
      expect(resolvePosterState(raw)).toBe('going')
    },
  )
})

describe('state labels', () => {
  it('uses the locked labels', () => {
    expect(posterStateLabel('going')).toBe("I'm going")
    expect(posterStateLabel('soldout')).toBe('Sold out')
    expect(posterStateLabel('drop')).toBe('Price drop')
  })
})

describe('share sheet copy', () => {
  it('exposes the eyebrow, destinations and alt template', () => {
    expect(CONSUMER_COPY.share.eyebrow).toBe('Share')
    // Three, not the prototype's six — see the note in copy.ts. The other
    // three tiles had no honest web implementation.
    expect(CONSUMER_COPY.share.destinations).toEqual({
      systemShare: 'Share…',
      saveImage: 'Save image',
      copyLink: 'Copy link',
    })
    expect(CONSUMER_COPY.share.altTemplate).toContain('{artist}')
    expect(CONSUMER_COPY.share.altTemplate).toContain('{venue}')
    expect(CONSUMER_COPY.share.altTemplate).toContain('{date}')
    expect(CONSUMER_COPY.share.altTemplate).toContain('{state}')
  })
})
