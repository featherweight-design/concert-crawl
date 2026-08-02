import { describe, expect, it } from 'vitest'
import {
  posterDropLabel,
  posterStateFor,
  toPosterEvent,
  type PosterSource,
} from '@/lib/share/poster-event'

const source: PosterSource = {
  id: '11111111-2222-4333-8444-555555555555',
  artist: 'Snakebite Revival',
  date: '2026-03-14',
  showTime: '20:00',
  venue: {
    name: 'Bluebird Theater',
    city: 'Denver',
    timezone: 'America/Denver',
  },
  ticketPriceMin: null,
  ticketPriceOpenedAt: null,
  priceStatus: 'live',
}

describe('posterStateFor', () => {
  it('defaults to going', () => {
    expect(posterStateFor(source)).toBe('going')
  })

  it('reads a drop from the opening price', () => {
    expect(
      posterStateFor({
        ...source,
        ticketPriceMin: '28.00',
        ticketPriceOpenedAt: 40,
      }),
    ).toBe('drop')
  })

  it('does not call a price rise a drop', () => {
    expect(
      posterStateFor({
        ...source,
        ticketPriceMin: '55.00',
        ticketPriceOpenedAt: 40,
      }),
    ).toBe('going')
  })

  it('lets sold out win over a drop', () => {
    // A poster for a gone show that reads "price dropped" is actively
    // misleading, so the precedence here is deliberate.
    expect(
      posterStateFor({
        ...source,
        priceStatus: 'soldout',
        ticketPriceMin: '28.00',
        ticketPriceOpenedAt: 40,
      }),
    ).toBe('soldout')
  })

  it('ignores an unparseable price rather than guessing', () => {
    expect(
      posterStateFor({
        ...source,
        ticketPriceMin: 'free',
        ticketPriceOpenedAt: 40,
      }),
    ).toBe('going')
  })
})

describe('posterDropLabel', () => {
  it('rounds the saving to whole dollars', () => {
    expect(
      posterDropLabel({ ticketPriceMin: '27.60', ticketPriceOpenedAt: 40 }),
    ).toBe('↓ $12')
  })

  it('is null for every non-drop', () => {
    expect(posterDropLabel(source)).toBeNull()
    expect(
      posterDropLabel({ ticketPriceMin: '55.00', ticketPriceOpenedAt: 40 }),
    ).toBeNull()
  })
})

describe('toPosterEvent', () => {
  it('maps an event onto the poster model', () => {
    const poster = toPosterEvent(source)
    expect(poster.artist).toBe('Snakebite Revival')
    expect(poster.venue).toBe('Bluebird Theater')
    expect(poster.city).toBe('Denver')
    expect(poster.state).toBe('going')
    expect(poster.dropLabel).toBeNull()
  })

  it('sets the date stamp in caps, in the venue timezone', () => {
    expect(toPosterEvent(source).dateShort).toBe('SAT, MAR 14')
  })

  it('carries a null show time through rather than inventing one', () => {
    expect(toPosterEvent({ ...source, showTime: null }).showTime).toBeNull()
  })
})
