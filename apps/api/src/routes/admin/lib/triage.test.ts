import { describe, it, expect } from 'vitest'
import {
  bandForCondition,
  classifyCrawlError,
  deriveSweep,
  formatDuration,
  nextNightlySweep,
  orderFaults,
  type TriageRunRow,
} from './triage.js'

const fault = (
  condition: string,
  days: number,
): { condition: string; days: number } => ({
  condition,
  days,
})

describe('orderFaults', () => {
  it('sorts by severity band, then persistence descending', () => {
    const ordered = orderFaults([
      fault('ceiling', 20),
      fault('wentDark', 1),
      fault('blocked', 2),
      fault('coverage', 9),
      fault('failed', 12),
    ])

    expect(ordered.map((row) => row.condition)).toEqual([
      'failed', // hard, 12d
      'blocked', // hard, 2d
      'coverage', // loss, 9d
      'wentDark', // loss, 1d
      'ceiling', // suspect
    ])
  })

  it('does not mutate its input', () => {
    const input = [fault('ceiling', 1), fault('blocked', 1)]
    orderFaults(input)
    expect(input.map((row) => row.condition)).toEqual(['ceiling', 'blocked'])
  })

  // A new alert category gets added crawler-side long before the admin
  // surface knows about it. The design mock throws a TypeError here; a triage
  // panel that white-screens on an unfamiliar alert is precisely the failure
  // this ticket exists to prevent.
  it('sorts an unrecognised condition last and never throws', () => {
    const run = (): { condition: string; days: number }[] =>
      orderFaults([
        fault('quantum_flux', 99),
        fault('ceiling', 1),
        fault('blocked', 1),
      ])

    expect(run).not.toThrow()
    expect(run().map((row) => row.condition)).toEqual([
      'blocked',
      'ceiling',
      'quantum_flux',
    ])
  })

  it('reports no band for an unrecognised condition', () => {
    expect(bandForCondition('quantum_flux')).toBeNull()
    expect(bandForCondition('wentDark')).toBe('loss')
  })
})

describe('formatDuration', () => {
  it('renders days, hours and minutes without overstating age', () => {
    expect(formatDuration(12)).toBe('12d')
    expect(formatDuration(1.99)).toBe('1d')
    expect(formatDuration(0.4)).toBe('9h')
    expect(formatDuration(0.02)).toBe('28m')
    expect(formatDuration(0)).toBe('1m')
  })
})

describe('classifyCrawlError', () => {
  it('buckets the failure into something scannable', () => {
    expect(classifyCrawlError(null, 403)).toBe('bot_detection')
    expect(classifyCrawlError(null, 429)).toBe('bot_detection')
    expect(classifyCrawlError(null, 503)).toBe('server_error')
    expect(classifyCrawlError('Navigation timeout of 30000ms', null)).toBe(
      'timeout',
    )
    expect(classifyCrawlError('robots.txt disallows /events', null)).toBe(
      'robots_disallowed',
    )
    expect(classifyCrawlError('net::ERR_CONNECTION_RESET', null)).toBe(
      'network_error',
    )
    expect(classifyCrawlError('Failed to parse JSON-LD block', null)).toBe(
      'parse_failure',
    )
    expect(classifyCrawlError(null, null)).toBe('unknown')
  })
})

describe('nextNightlySweep', () => {
  it('always lands on a future instant', () => {
    const now = new Date('2026-07-30T18:00:00Z')
    expect(nextNightlySweep(now).getTime()).toBeGreaterThan(now.getTime())
  })

  it('never returns a sweep more than a day out', () => {
    const now = new Date('2026-07-30T09:30:00Z')
    const next = nextNightlySweep(now)
    expect(next.getTime() - now.getTime()).toBeLessThanOrEqual(
      25 * 60 * 60 * 1000,
    )
  })
})

const runRow = (overrides: Partial<TriageRunRow>): TriageRunRow => ({
  id: '00000000-0000-0000-0000-000000000001',
  venueId: '00000000-0000-0000-0000-0000000000aa',
  status: 'success',
  httpStatusCode: 200,
  errorMessage: null,
  eventsFound: 10,
  eventsUsable: 10,
  eventsInserted: 3,
  eventsUpdated: 2,
  furthestEventDate: null,
  createdAt: new Date('2026-07-30T09:02:00Z'),
  ...overrides,
})

describe('deriveSweep', () => {
  it('totals events from the last 24 hours only', () => {
    const now = new Date('2026-07-30T12:00:00Z')
    const sweep = deriveSweep({
      venueCount: 11,
      runs: [
        runRow({ eventsInserted: 5, eventsUpdated: 4 }),
        runRow({
          createdAt: new Date('2026-07-20T09:02:00Z'),
          eventsInserted: 100,
          eventsUpdated: 100,
        }),
      ],
      now,
    })

    expect(sweep.venues).toBe(11)
    expect(sweep.events).toBe(9)
    expect(sweep.atIso).toBe('2026-07-30T09:02:00.000Z')
  })

  it('reports a placeholder time when no venue has ever been crawled', () => {
    const sweep = deriveSweep({
      venueCount: 0,
      runs: [],
      now: new Date('2026-07-30T12:00:00Z'),
    })
    expect(sweep.atIso).toBeNull()
    expect(sweep.at).toBe('—')
  })
})
