import { describe, it, expect } from 'vitest'
import { TRIAGE_NO_SWEEP } from '@concert-crawl/types'
import {
  bandForCondition,
  classifyCrawlError,
  deriveSweep,
  faultAcknowledgementKey,
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

  const mtHour = (when: Date) =>
    Number(
      when.toLocaleString('en-US', {
        timeZone: 'America/Denver',
        hour: 'numeric',
        hour12: false,
      }),
    )

  // An hour-delta derived from the current Mountain hour lands at 2 AM on
  // fall-back night and 4 AM on spring-forward night.
  it('still lands on 3 AM Mountain across the fall-back transition', () => {
    // 2026-11-01: Denver falls back 02:00 MDT -> 01:00 MST.
    const now = new Date('2026-11-01T04:00:00Z')
    expect(mtHour(nextNightlySweep(now))).toBe(3)
  })

  it('still lands on 3 AM Mountain across the spring-forward transition', () => {
    // 2026-03-08: Denver springs forward 02:00 MST -> 03:00 MDT.
    const now = new Date('2026-03-08T04:00:00Z')
    expect(mtHour(nextNightlySweep(now))).toBe(3)
  })

  it('skips to the next day when already inside the 3 AM hour', () => {
    const now = new Date('2026-07-30T09:30:00Z') // 03:30 MDT
    const next = nextNightlySweep(now)
    expect(mtHour(next)).toBe(3)
    expect(next.getTime() - now.getTime()).toBeGreaterThan(12 * 60 * 60 * 1000)
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
    expect(sweep.at).toBe(TRIAGE_NO_SWEEP)
  })
})

describe('faultAcknowledgementKey', () => {
  const base = {
    id: 'venue-1:ceiling',
    venueId: 'venue-1',
    venue: 'Summit Music Hall',
    persistedSince: '2026-07-20T09:00:00Z',
    days: 24,
    dur: '24d',
    crawlRunId: null,
    band: 'suspect' as const,
  }

  it('keys a pinned ceiling on the event count', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        condition: 'ceiling',
        evidence: {
          kind: 'pinned_count',
          count: 36,
          runs: 5,
          was: null,
          wasWhen: null,
          furthest: null,
          best: null,
          shrankDays: null,
          series: [36, 36, 36],
        },
      }),
    ).toEqual({
      condition: 'ceiling',
      evidenceKind: 'pinned_count',
      evidenceValue: '36',
    })
  })

  it('keys a shrunken horizon on the furthest event date', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        condition: 'ceiling',
        evidence: {
          kind: 'horizon_shrank',
          count: 41,
          runs: 1,
          was: null,
          wasWhen: null,
          furthest: '2026-11-15',
          best: '2027-03-02',
          shrankDays: 107,
          series: [41],
        },
      }),
    ).toEqual({
      condition: 'ceiling',
      evidenceKind: 'horizon_shrank',
      evidenceValue: '2026-11-15',
    })
  })

  it('keys wentDark on the usable event count', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        band: 'loss',
        condition: 'wentDark',
        evidence: {
          count: 0,
          baselineCount: 30,
          avg: 30.2,
          pct: -100,
          window: 5,
          threshold: -70,
          series: [30, 29, 0],
        },
      }),
    ).toEqual({
      condition: 'wentDark',
      evidenceKind: null,
      evidenceValue: '0',
    })
  })

  it('keys coverage on the uncovered count', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        band: 'loss',
        condition: 'coverage',
        evidence: { matched: 4, expected: 12, uncovered: 8, wasWhen: null },
      }),
    ).toEqual({
      condition: 'coverage',
      evidenceKind: null,
      evidenceValue: '8',
    })
  })

  it('keys blocked on the HTTP status', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        band: 'hard',
        condition: 'blocked',
        evidence: { status: 403, refusals: 3, lastSuccess: 'Jul 18' },
      }),
    ).toEqual({
      condition: 'blocked',
      evidenceKind: null,
      evidenceValue: '403',
    })
  })

  // A venue that never returned a status has no figure to acknowledge. Null is
  // a legal acknowledged value, not a missing one.
  it('keys blocked with no recorded status as a null value', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        band: 'hard',
        condition: 'blocked',
        evidence: { status: null, refusals: 3, lastSuccess: null },
      }),
    ).toEqual({
      condition: 'blocked',
      evidenceKind: null,
      evidenceValue: null,
    })
  })

  it('keys a failing crawl on the error class', () => {
    expect(
      faultAcknowledgementKey({
        ...base,
        band: 'hard',
        condition: 'failed',
        evidence: { failures: 2, errorClass: 'timeout', pauseAt: 3 },
      }),
    ).toEqual({
      condition: 'failed',
      evidenceKind: null,
      evidenceValue: 'timeout',
    })
  })
})
