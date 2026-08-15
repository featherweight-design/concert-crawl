import { describe, expect, it, vi } from 'vitest'
import { deriveArtists, isSuspiciousObservation } from './derive-artists.js'

const neverCalled = vi.fn(() => {
  throw new Error('adjudicator must not be called')
})

const base = { rawTitle: '', description: undefined }

describe('ladder step 1 — observed performers win', () => {
  it('takes the headliner and supporting acts without an LLM call', async () => {
    const result = await deriveArtists(
      {
        ...base,
        title: 'Thee Sacred Souls at the Ogden',
        observedPerformers: ['Thee Sacred Souls', 'LA LOM'],
      },
      neverCalled,
    )

    expect(result).toEqual({
      headliners: ['Thee Sacred Souls'],
      supportingArtists: ['LA LOM'],
      isConcert: true,
      adjudicated: false,
    })
  })
})

describe('ladder step 2 — escalation', () => {
  it('escalates when nobody was named', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })

    const result = await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: [],
      },
      adjudicate,
    )

    expect(adjudicate).toHaveBeenCalledOnce()
    expect(result.headliners).toEqual(['Daedelus'])
    expect(result.adjudicated).toBe(true)
  })

  it('escalates when the observed performer is just the title', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: ['Daedelus'],
      supportingArtists: [],
    })

    await deriveArtists(
      {
        ...base,
        title: '@adsfradio presents: Daedelus',
        observedPerformers: ['@adsfradio presents: Daedelus'],
      },
      adjudicate,
    )

    expect(adjudicate).toHaveBeenCalledOnce()
  })
})

describe('ladder step 3 — no performer is a real answer', () => {
  it('resolves to an empty headliner list and a non-concert', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: false,
      headliners: [],
      supportingArtists: [],
    })

    const result = await deriveArtists(
      { ...base, title: 'HUMP! Film Festival', observedPerformers: [] },
      adjudicate,
    )

    expect(result).toEqual({
      headliners: [],
      supportingArtists: [],
      isConcert: false,
      adjudicated: true,
    })
  })

  it('never falls back to the title when the adjudicator returns nothing', async () => {
    const adjudicate = vi.fn().mockResolvedValue({
      isConcert: true,
      headliners: [],
      supportingArtists: [],
    })

    const result = await deriveArtists(
      { ...base, title: 'Bass Package', observedPerformers: [] },
      adjudicate,
    )

    expect(result.headliners).toEqual([])
  })

  it('treats an adjudicator failure as unresolved rather than as the title', async () => {
    const adjudicate = vi.fn().mockRejectedValue(new Error('haiku 529'))

    const result = await deriveArtists(
      { ...base, title: '80s Bash', observedPerformers: [] },
      adjudicate,
    )

    expect(result).toEqual({
      headliners: [],
      supportingArtists: [],
      isConcert: true,
      adjudicated: false,
    })
  })
})

describe('isSuspiciousObservation', () => {
  const suspicious: [string, string][] = [
    ['80s Bash', '80s Bash'],
    ['@adsfradio presents: Daedelus', '@adsfradio presents: Daedelus'],
    ['303 Boards Benefit Show', '303 Boards Benefit Show'],
    ['A Great Night in Hip Hop', 'A Great Night in Hip Hop'],
  ]
  it.each(suspicious)('flags %s', (observed, title) => {
    expect(isSuspiciousObservation(observed, title)).toBe(true)
  })

  // Real band names that must NOT be escalated — escalating them would spend
  // an LLM call and risk the model second-guessing correct venue data.
  const clean: [string, string][] = [
    ['Goodnight, Texas', 'Goodnight, Texas at Globe Hall'],
    ['hey, nothing', 'hey, nothing — Denver'],
    ['Crosby, Stills & Nash', 'Crosby, Stills & Nash'],
    ['Earth, Wind & Fire', 'Earth, Wind & Fire at Red Rocks'],
    ['blink-182', 'blink-182 at Ball Arena'],
    ['311', '311 at Red Rocks'],
  ]
  it.each(clean)('does not flag %s', (observed, title) => {
    expect(isSuspiciousObservation(observed, title)).toBe(false)
  })
})
