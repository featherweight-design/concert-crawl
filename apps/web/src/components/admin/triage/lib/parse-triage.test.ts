import { describe, it, expect } from 'vitest'

import { parseFault, parseQueue, parseTriageResponse } from './parse-triage'

const base = {
  id: 'f-1',
  venueId: '11111111-1111-1111-1111-111111111111',
  venue: 'Bluebird Theater',
  band: 'hard',
  persistedSince: '2026-07-24T09:00:00.000Z',
  days: 6,
  dur: '6d',
  crawlRunId: '22222222-2222-2222-2222-222222222222',
}

const blocked = {
  ...base,
  condition: 'blocked',
  evidence: { status: 403, refusals: 4, lastSuccess: 'Jul 24' },
}

const sweep = {
  venues: 30,
  at: '3:04 AM',
  atIso: '2026-07-30T09:04:00.000Z',
  events: 812,
  next: 'tomorrow 3:00 AM',
}

describe('parseFault', () => {
  it('accepts each of the five conditions', () => {
    const conditions = [
      blocked,
      {
        ...base,
        condition: 'failed',
        evidence: { failures: 3, errorClass: 'timeout', pauseAt: 3 },
      },
      {
        ...base,
        condition: 'wentDark',
        evidence: {
          count: 2,
          baselineCount: 18,
          avg: 17,
          pct: -88,
          window: 7,
          threshold: -70,
          series: [18, 17, 19, 2],
        },
      },
      {
        ...base,
        condition: 'ceiling',
        evidence: {
          kind: 'pinned_count',
          count: 20,
          runs: 5,
          was: 31,
          wasWhen: 'Jul 18',
          furthest: null,
          best: null,
          shrankDays: null,
          series: [31, 20, 20, 20],
        },
      },
      {
        ...base,
        condition: 'coverage',
        evidence: { matched: 9, expected: 14, uncovered: 5, wasWhen: 'Jul 12' },
      },
    ]
    for (const row of conditions) expect(parseFault(row)).not.toBeNull()
  })

  // A sixth alert category can ship crawler-side before the panel knows about
  // it. The row is dropped; the panel must not throw and must not blank.
  it('drops an unrecognised condition instead of throwing', () => {
    const unknown = {
      ...base,
      condition: 'certificateExpired',
      evidence: { daysLeft: 3 },
    }
    expect(() => parseFault(unknown)).not.toThrow()
    expect(parseFault(unknown)).toBeNull()
  })

  it('accepts null for every nullable evidence field', () => {
    expect(
      parseFault({
        ...base,
        crawlRunId: null,
        condition: 'blocked',
        evidence: { status: null, refusals: 2, lastSuccess: null },
      }),
    ).not.toBeNull()
    expect(
      parseFault({
        ...base,
        condition: 'ceiling',
        evidence: {
          kind: 'horizon_shrank',
          count: 25,
          runs: 4,
          was: null,
          wasWhen: null,
          furthest: null,
          best: null,
          shrankDays: null,
          series: [30, 25],
        },
      }),
    ).not.toBeNull()
    expect(
      parseFault({
        ...base,
        condition: 'coverage',
        evidence: { matched: 9, expected: 14, uncovered: 5, wasWhen: null },
      }),
    ).not.toBeNull()
  })

  // An absent key reads as `undefined` and would interpolate the literal
  // string "undefined". The API declares these explicitly-null, so a missing
  // key is a contract break, not a null.
  it('rejects an absent nullable key', () => {
    const withoutStatus: Record<string, unknown> = { ...blocked.evidence }
    delete withoutStatus.status
    expect(parseFault({ ...blocked, evidence: withoutStatus })).toBeNull()
  })

  it('rejects a malformed band, a non-array series and a non-object row', () => {
    expect(parseFault({ ...blocked, band: 'critical' })).toBeNull()
    expect(
      parseFault({
        ...base,
        condition: 'wentDark',
        evidence: {
          count: 2,
          baselineCount: 18,
          avg: 17,
          pct: -88,
          window: 7,
          threshold: -70,
          series: 'nope',
        },
      }),
    ).toBeNull()
    expect(parseFault(null)).toBeNull()
    expect(parseFault('blocked')).toBeNull()
  })
})

describe('parseQueue', () => {
  it('accepts both queue kinds and rejects an unknown action', () => {
    expect(
      parseQueue({
        id: 'q-flags',
        kind: 'eventFlags',
        count: 3,
        breakdown: 'Bluebird 3',
        action: 'openReview',
      }),
    ).not.toBeNull()
    expect(
      parseQueue({
        id: 'q-prices',
        kind: 'priceSubmissions',
        count: 5,
        breakdown: 'Khruangbin @ Ogden · 2 more',
        action: 'openSubmissions',
      }),
    ).not.toBeNull()
    expect(
      parseQueue({
        id: 'q-x',
        kind: 'eventFlags',
        count: 1,
        breakdown: '',
        action: 'openSomethingElse',
      }),
    ).toBeNull()
  })
})

describe('parseTriageResponse', () => {
  it('keeps the good rows when one row is unrecognised', () => {
    const parsed = parseTriageResponse({
      faults: [
        blocked,
        { ...base, id: 'f-2', condition: 'meteorStrike', evidence: {} },
        {
          ...base,
          id: 'f-3',
          condition: 'blocked',
          evidence: blocked.evidence,
        },
      ],
      queues: [
        {
          id: 'q-x',
          kind: 'unknownQueue',
          count: 1,
          breakdown: '',
          action: 'openReview',
        },
        {
          id: 'q-flags',
          kind: 'eventFlags',
          count: 3,
          breakdown: 'Bluebird 3',
          action: 'openReview',
        },
      ],
      sweep,
    })
    expect(parsed?.faults.map((fault) => fault.id)).toEqual(['f-1', 'f-3'])
    expect(parsed?.queues).toHaveLength(1)
  })

  it('preserves the server ordering rather than re-sorting', () => {
    const parsed = parseTriageResponse({
      faults: [
        {
          ...base,
          id: 'f-suspect',
          band: 'suspect',
          condition: 'blocked',
          evidence: blocked.evidence,
        },
        {
          ...base,
          id: 'f-hard',
          condition: 'blocked',
          evidence: blocked.evidence,
        },
      ],
      queues: [],
      sweep,
    })
    expect(parsed?.faults.map((fault) => fault.id)).toEqual([
      'f-suspect',
      'f-hard',
    ])
  })

  it('returns null only when the envelope itself is unusable', () => {
    expect(parseTriageResponse(null)).toBeNull()
    expect(parseTriageResponse({ faults: [], queues: [] })).toBeNull()
    expect(
      parseTriageResponse({ faults: 'none', queues: [], sweep }),
    ).toBeNull()
    expect(
      parseTriageResponse({
        faults: [],
        queues: [],
        sweep: { ...sweep, atIso: undefined },
      }),
    ).toBeNull()
    expect(
      parseTriageResponse({
        faults: [],
        queues: [],
        sweep: { ...sweep, atIso: null },
      }),
    ).not.toBeNull()
  })
})
