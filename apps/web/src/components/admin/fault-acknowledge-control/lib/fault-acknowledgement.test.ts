import { describe, it, expect } from 'vitest'

import { acknowledgementEvidence } from './fault-acknowledgement'
import type { TriageFault } from '@/components/admin/triage/definitions/types'

const base = {
  id: 'f-1',
  venueId: '11111111-1111-1111-1111-111111111111',
  venue: 'Summit',
  band: 'suspect' as const,
  persistedSince: '2026-08-08T09:00:00.000Z',
  days: 6,
  dur: '6d',
  crawlRunId: null,
}

const ceiling = (
  kind: 'pinned_count' | 'horizon_shrank',
  overrides: Partial<TriageFault & { condition: 'ceiling' }> = {},
): TriageFault => ({
  ...base,
  condition: 'ceiling',
  evidence: {
    kind,
    count: 36,
    runs: 5,
    was: null,
    wasWhen: null,
    furthest: kind === 'horizon_shrank' ? '2026-11-08' : null,
    best: null,
    shrankDays: null,
    series: [],
  },
  ...overrides,
})

describe('acknowledgementEvidence', () => {
  it('pins a count ceiling to its count', () => {
    expect(acknowledgementEvidence(ceiling('pinned_count'))).toEqual({
      evidenceKind: 'pinned_count',
      evidenceValue: '36',
    })
  })

  it('pins a shrinking horizon to its furthest date', () => {
    expect(acknowledgementEvidence(ceiling('horizon_shrank'))).toEqual({
      evidenceKind: 'horizon_shrank',
      evidenceValue: '2026-11-08',
    })
  })

  it('pins a dark venue to the count it collapsed to', () => {
    expect(
      acknowledgementEvidence({
        ...base,
        condition: 'wentDark',
        evidence: {
          count: 2,
          baselineCount: 18,
          avg: 17,
          pct: -88,
          window: 7,
          threshold: -70,
          series: [],
        },
      }),
    ).toEqual({ evidenceKind: null, evidenceValue: '2' })
  })

  it('pins a coverage gap to the uncovered count', () => {
    expect(
      acknowledgementEvidence({
        ...base,
        condition: 'coverage',
        evidence: { matched: 4, expected: 12, uncovered: 8, wasWhen: null },
      }),
    ).toEqual({ evidenceKind: null, evidenceValue: '8' })
  })

  it('pins a blocked venue to its http status', () => {
    expect(
      acknowledgementEvidence({
        ...base,
        condition: 'blocked',
        evidence: { status: 403, refusals: 4, lastSuccess: null },
      }),
    ).toEqual({ evidenceKind: null, evidenceValue: '403' })
  })

  it('leaves the figure empty when a blocked venue returned no status', () => {
    expect(
      acknowledgementEvidence({
        ...base,
        condition: 'blocked',
        evidence: { status: null, refusals: 4, lastSuccess: null },
      }),
    ).toEqual({ evidenceKind: null, evidenceValue: null })
  })

  it('pins a failing venue to its error class', () => {
    expect(
      acknowledgementEvidence({
        ...base,
        condition: 'failed',
        evidence: { failures: 3, errorClass: 'timeout', pauseAt: 3 },
      }),
    ).toEqual({ evidenceKind: null, evidenceValue: 'timeout' })
  })
})
