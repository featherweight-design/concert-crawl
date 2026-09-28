import { describe, it, expect } from 'vitest'
import { evaluateRunHealth, type VenueRunOutcome } from './run-health.js'

const QUOTA =
  'Error: 400 {"error":{"message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}'

const ok = (name: string): VenueRunOutcome => ({
  venueId: name,
  venueName: name,
  errorMessage: null,
})
const failed = (name: string, message: string): VenueRunOutcome => ({
  venueId: name,
  venueName: name,
  errorMessage: message,
})
const healthy = (count: number) =>
  Array.from({ length: count }, (_, i) => ok(`ok-${i}`))

describe('evaluateRunHealth', () => {
  it('reports nothing for a clean run', () => {
    expect(evaluateRunHealth(healthy(20))).toEqual([])
  })

  it('reports the 2026-09-28 run as both a failure rate and a shared cause', () => {
    const names = [
      'Red Rocks',
      'Cervantes',
      'Hi-Dive',
      'Larimer',
      'Globe Hall',
      'Lost Lake',
      'Ball Arena',
      'Meow Wolf',
    ]
    const result = evaluateRunHealth([
      ...names.map((name) => failed(name, QUOTA)),
      ...healthy(12),
    ])
    expect(result).toContainEqual({
      kind: 'failure_rate',
      failed: 8,
      total: 20,
    })
    expect(result).toContainEqual({
      kind: 'shared_cause',
      errorKey: 'llm_quota',
      errorKind: 'llm_quota',
      venueNames: [...names].sort(),
    })
  })

  it('stays quiet for one venue failing, which is ordinary (3 such days in 91)', () => {
    expect(
      evaluateRunHealth([
        failed('Larimer', 'TypeError: fetch failed'),
        ...healthy(19),
      ]),
    ).toEqual([])
  })

  it('counts distinct venues, not outcomes: one venue twice is not a shared cause', () => {
    // Defensive: the daily loop crawls each venue once, but a caller that merged
    // triggered and daily outcomes would not. Prod's only repeated-error day
    // (2026-07-18, Levitt Pavilion) was exactly that shape across two runs.
    const robots = 'VenuePilotFetchError: robots.txt disallows ConcertCrawl/1.0'
    const shared = evaluateRunHealth([
      failed('Levitt', robots),
      failed('Levitt', robots),
      ...healthy(18),
    ]).filter((degradation) => degradation.kind === 'shared_cause')
    expect(shared).toEqual([])
  })

  it('flags two different venues failing on the same normalized error', () => {
    const shared = evaluateRunHealth([
      failed(
        'A',
        'TimeoutError: Timeout 30000ms exceeded navigating to https://a.example.com',
      ),
      failed(
        'B',
        'TimeoutError: Timeout 30000ms exceeded navigating to https://b.example.com',
      ),
      ...healthy(18),
    ]).filter((degradation) => degradation.kind === 'shared_cause')
    expect(shared).toHaveLength(1)
  })

  it('needs 3 failures before the rate alone fires, so a tiny run cannot trip it', () => {
    const rate = evaluateRunHealth([
      failed('A', 'x'),
      failed('B', 'y'),
      ok('C'),
    ]).filter((degradation) => degradation.kind === 'failure_rate')
    expect(rate).toEqual([])
  })
})
