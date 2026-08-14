// Table-driven coverage of the pure fault classifiers. These functions are the
// single home for every triage threshold, so the boundaries — at, just over,
// just under — are the whole point of this file.

import { describe, expect, it } from 'vitest'
import {
  COVERAGE_GAP_RATIO,
  COVERAGE_MIN_CATALOGUE,
  HORIZON_SHRINK_DAYS,
  matchesAcknowledgement,
  PINNED_MIN_COUNT,
  PINNED_RUN_COUNT,
  SOFT_DROP_RATIO,
  classifyDrop,
  computeBaselineCount,
  detectHorizonShrink,
  detectPinnedCount,
  evaluateCeilingCondition,
  evaluateCoverageCondition,
  evaluateEventCountCondition,
  type CeilingHistoryRun,
} from './triage-conditions.js'

describe('triage-conditions — no side effects', () => {
  it('leaves its inputs untouched', () => {
    const baselineUsableCounts = [10, 10, 10]
    const recent: CeilingHistoryRun[] = [
      { eventsFound: 20, furthestEventDate: '2026-09-01' },
      { eventsFound: 20, furthestEventDate: '2026-09-01' },
      { eventsFound: 20, furthestEventDate: '2026-09-01' },
      { eventsFound: 20, furthestEventDate: '2026-09-01' },
    ]

    evaluateEventCountCondition({ eventsUsable: 0, baselineUsableCounts })
    evaluateCeilingCondition({
      eventsFound: 20,
      furthestEventDate: '2026-09-01',
      recent,
    })

    expect(baselineUsableCounts).toEqual([10, 10, 10])
    expect(recent).toHaveLength(4)
  })
})

describe('classifyDrop', () => {
  // baseline 10 → the dropped_sharply boundary sits at 10 * 0.3 = 3, and the
  // comparison is strict, so exactly 3 is healthy and 2 is a drop.
  const cases: {
    name: string
    eventsUsable: number
    baselineCount: number
    expected: ReturnType<typeof classifyDrop>
  }[] = [
    {
      name: 'zero events is went_dark',
      eventsUsable: 0,
      baselineCount: 10,
      expected: 'went_dark',
    },
    {
      name: 'at the threshold is healthy',
      eventsUsable: 3,
      baselineCount: 10,
      expected: null,
    },
    {
      name: 'just under the threshold drops',
      eventsUsable: 2,
      baselineCount: 10,
      expected: 'dropped_sharply',
    },
    {
      name: 'just over the threshold is healthy',
      eventsUsable: 4,
      baselineCount: 10,
      expected: null,
    },
    {
      name: 'at baseline is healthy',
      eventsUsable: 10,
      baselineCount: 10,
      expected: null,
    },
    {
      name: 'above baseline is healthy',
      eventsUsable: 40,
      baselineCount: 10,
      expected: null,
    },
    {
      name: 'zero baseline never classifies',
      eventsUsable: 0,
      baselineCount: 0,
      expected: null,
    },
    {
      name: 'negative baseline never classifies',
      eventsUsable: 0,
      baselineCount: -1,
      expected: null,
    },
  ]

  it.each(cases)('$name', ({ eventsUsable, baselineCount, expected }) => {
    expect(classifyDrop(eventsUsable, baselineCount)).toBe(expected)
  })

  it('derives its boundary from SOFT_DROP_RATIO rather than a literal', () => {
    const baselineCount = 100
    const boundary = baselineCount * SOFT_DROP_RATIO
    expect(classifyDrop(boundary, baselineCount)).toBeNull()
    expect(classifyDrop(boundary - 1, baselineCount)).toBe('dropped_sharply')
  })
})

describe('computeBaselineCount', () => {
  it('averages the window', () => {
    expect(computeBaselineCount([10, 20, 30])).toBe(20)
  })

  it('returns zero for an empty window rather than NaN', () => {
    expect(computeBaselineCount([])).toBe(0)
  })
})

describe('evaluateEventCountCondition', () => {
  it('cold-starts below three baseline readings', () => {
    expect(
      evaluateEventCountCondition({
        eventsUsable: 0,
        baselineUsableCounts: [12, 12],
      }),
    ).toEqual({ detected: false, reason: 'cold_start' })
  })

  it('cold-starts on an empty history', () => {
    expect(
      evaluateEventCountCondition({
        eventsUsable: 0,
        baselineUsableCounts: [],
      }),
    ).toEqual({ detected: false, reason: 'cold_start' })
  })

  it('arms at exactly three baseline readings', () => {
    const result = evaluateEventCountCondition({
      eventsUsable: 0,
      baselineUsableCounts: [12, 12, 12],
    })
    expect(result.detected).toBe(true)
  })

  it('reports went_dark with the evidence figures — the #624 Bluebird case', () => {
    const result = evaluateEventCountCondition({
      eventsUsable: 0,
      baselineUsableCounts: [70, 70, 70, 70, 70, 70, 70],
    })
    expect(result).toEqual({
      detected: true,
      condition: 'went_dark',
      eventsUsable: 0,
      baselineCount: 70,
      dropPercent: 100,
    })
  })

  it('reports dropped_sharply just under the threshold', () => {
    const result = evaluateEventCountCondition({
      eventsUsable: 2,
      baselineUsableCounts: [10, 10, 10],
    })
    expect(result).toMatchObject({
      detected: true,
      condition: 'dropped_sharply',
      baselineCount: 10,
      dropPercent: 80,
    })
  })

  it('reports no_drop at the threshold', () => {
    expect(
      evaluateEventCountCondition({
        eventsUsable: 3,
        baselineUsableCounts: [10, 10, 10],
      }),
    ).toEqual({ detected: false, reason: 'no_drop' })
  })

  it('reports no_drop just over the threshold', () => {
    expect(
      evaluateEventCountCondition({
        eventsUsable: 4,
        baselineUsableCounts: [10, 10, 10],
      }),
    ).toEqual({ detected: false, reason: 'no_drop' })
  })

  // Since #1165 a run that keeps zero usable events is written to crawl_runs
  // with status 'partial' rather than 'success'. The classifier is deliberately
  // blind to run status — the caller owns row selection — so the same zero
  // count classifies identically whichever status was recorded. The baseline
  // itself is built from non-zero successful runs only, so a partial run never
  // drags it down; this asserts that shape.
  it('classifies a zero-usable (partial-status) run without it entering the baseline', () => {
    const baselineUsableCounts = [12, 11, 13]
    expect(
      evaluateEventCountCondition({ eventsUsable: 0, baselineUsableCounts }),
    ).toMatchObject({ detected: true, condition: 'went_dark' })
    expect(computeBaselineCount(baselineUsableCounts)).toBeCloseTo(12)
  })
})

describe('detectHorizonShrink', () => {
  const horizons = (...dates: (string | null)[]) =>
    dates.map((furthestEventDate) => ({ furthestEventDate }))

  it('returns null when this run has no horizon reading', () => {
    expect(
      detectHorizonShrink(
        null,
        horizons('2026-12-01', '2026-12-01', '2026-12-01'),
      ),
    ).toBeNull()
  })

  it('cold-starts below three non-null readings', () => {
    expect(
      detectHorizonShrink('2026-08-12', horizons('2026-12-01', null, null)),
    ).toBeNull()
  })

  it('returns null just under the shrink threshold', () => {
    // 29 days closer than the best reading.
    expect(
      detectHorizonShrink(
        '2026-11-02',
        horizons('2026-12-01', '2026-12-01', '2026-12-01'),
      ),
    ).toBeNull()
  })

  it('fires at exactly the shrink threshold', () => {
    const result = detectHorizonShrink(
      '2026-11-01',
      horizons('2026-12-01', '2026-12-01', '2026-12-01'),
    )
    expect(result).toMatchObject({
      condition: 'horizon_shrank',
      shrankDays: HORIZON_SHRINK_DAYS,
      furthestEventDate: '2026-11-01',
      bestFurthestEventDate: '2026-12-01',
    })
  })

  it('fires just over the shrink threshold', () => {
    expect(
      detectHorizonShrink(
        '2026-10-31',
        horizons('2026-12-01', '2026-12-01', '2026-12-01'),
      ),
    ).toMatchObject({ condition: 'horizon_shrank', shrankDays: 31 })
  })

  it('compares against the best reading, not the most recent', () => {
    // A cap ratcheting in over several nights: the most recent reading is only
    // days ahead, but the window's best is months out.
    const result = detectHorizonShrink(
      '2026-08-12',
      horizons('2026-08-20', '2026-09-15', '2026-12-01'),
    )
    expect(result).toMatchObject({
      condition: 'horizon_shrank',
      bestFurthestEventDate: '2026-12-01',
    })
  })

  it('never fires on a horizon that grew', () => {
    expect(
      detectHorizonShrink(
        '2027-06-01',
        horizons('2026-12-01', '2026-12-01', '2026-12-01'),
      ),
    ).toBeNull()
  })
})

describe('detectPinnedCount', () => {
  const runs = (count: number, howMany: number) =>
    Array.from({ length: howMany }, () => ({ eventsFound: count }))

  it('returns null below the minimum count', () => {
    expect(
      detectPinnedCount(PINNED_MIN_COUNT - 1, runs(PINNED_MIN_COUNT - 1, 4)),
    ).toBeNull()
  })

  it('fires at exactly the minimum count with a full streak', () => {
    expect(
      detectPinnedCount(PINNED_MIN_COUNT, runs(PINNED_MIN_COUNT, 4)),
    ).toMatchObject({
      condition: 'pinned_count',
      eventsFound: PINNED_MIN_COUNT,
      runCount: PINNED_RUN_COUNT,
    })
  })

  it('returns null one prior run short of the streak', () => {
    expect(detectPinnedCount(36, runs(36, 3))).toBeNull()
  })

  it('fires on a longer window, reading only the runs it needs', () => {
    expect(
      detectPinnedCount(36, [...runs(36, 4), { eventsFound: 41 }]),
    ).toMatchObject({ condition: 'pinned_count', eventsFound: 36 })
  })

  it('returns null when one run in the streak differs', () => {
    expect(
      detectPinnedCount(36, [...runs(36, 3), { eventsFound: 35 }]),
    ).toBeNull()
  })

  it('never fires on a zero-event run', () => {
    expect(detectPinnedCount(0, runs(0, 4))).toBeNull()
  })
})

describe('evaluateCeilingCondition', () => {
  const stable = (count: number, date: string | null, howMany: number) =>
    Array.from({ length: howMany }, () => ({
      eventsFound: count,
      furthestEventDate: date,
    }))

  it('cold-starts below three prior runs', () => {
    expect(
      evaluateCeilingCondition({
        eventsFound: 36,
        furthestEventDate: '2026-08-12',
        recent: stable(36, '2026-12-01', 2),
      }),
    ).toEqual({ detected: false, reason: 'cold_start' })
  })

  it('reports no_ceiling on a healthy venue', () => {
    expect(
      evaluateCeilingCondition({
        eventsFound: 41,
        furthestEventDate: '2026-12-05',
        recent: [
          { eventsFound: 38, furthestEventDate: '2026-11-28' },
          { eventsFound: 36, furthestEventDate: '2026-11-20' },
          { eventsFound: 40, furthestEventDate: '2026-11-15' },
        ],
      }),
    ).toEqual({ detected: false, reason: 'no_ceiling' })
  })

  it('keeps horizon_shrank and pinned_count as separate fingerprints', () => {
    const horizon = evaluateCeilingCondition({
      eventsFound: 5,
      furthestEventDate: '2026-08-12',
      recent: stable(5, '2026-12-01', 4),
    })
    const pinned = evaluateCeilingCondition({
      eventsFound: 36,
      furthestEventDate: null,
      recent: stable(36, null, 4),
    })

    expect(horizon).toMatchObject({
      condition: 'horizon_shrank',
      bestFurthestEventDate: '2026-12-01',
    })
    expect(pinned).toMatchObject({ condition: 'pinned_count', eventsFound: 36 })
    // Each variant carries its own evidence, so a renderer can say "furthest
    // show pulled back to Aug 12" and "stuck at 36 events" from the same union.
    expect(horizon.detected && 'eventsFound' in horizon).toBe(false)
    expect(pinned.detected && 'furthestEventDate' in pinned).toBe(false)
  })

  it('prefers the horizon fingerprint when both are true', () => {
    expect(
      evaluateCeilingCondition({
        eventsFound: 36,
        furthestEventDate: '2026-08-12',
        recent: stable(36, '2026-12-01', 4),
      }),
    ).toMatchObject({ condition: 'horizon_shrank' })
  })
})

describe('evaluateCoverageCondition', () => {
  it('skips a catalogue below the minimum', () => {
    expect(
      evaluateCoverageCondition({
        upcomingCount: COVERAGE_MIN_CATALOGUE - 1,
        uncoveredCount: COVERAGE_MIN_CATALOGUE - 1,
      }),
    ).toEqual({
      detected: false,
      reason: 'small_catalogue',
      upcomingCount: COVERAGE_MIN_CATALOGUE - 1,
      uncoveredCount: COVERAGE_MIN_CATALOGUE - 1,
    })
  })

  it('arms at exactly the minimum catalogue', () => {
    expect(
      evaluateCoverageCondition({
        upcomingCount: COVERAGE_MIN_CATALOGUE,
        uncoveredCount: COVERAGE_MIN_CATALOGUE,
      }),
    ).toMatchObject({ detected: true, condition: 'no_coverage' })
  })

  it('fires at the gap ratio boundary and clears just under it', () => {
    // 3 of 10 is 0.3, and the comparison is strict, so this is a gap.
    expect(
      evaluateCoverageCondition({ upcomingCount: 10, uncoveredCount: 3 }),
    ).toMatchObject({ detected: true, condition: 'partial_gap' })
    // 2 of 10 is 0.2 — under the ratio.
    expect(
      evaluateCoverageCondition({ upcomingCount: 10, uncoveredCount: 2 }),
    ).toEqual({
      detected: false,
      reason: 'covered',
      upcomingCount: 10,
      uncoveredCount: 2,
    })
  })

  it('derives its boundary from COVERAGE_GAP_RATIO rather than a literal', () => {
    const upcomingCount = 100
    const boundary = upcomingCount * COVERAGE_GAP_RATIO
    expect(
      evaluateCoverageCondition({ upcomingCount, uncoveredCount: boundary }),
    ).toMatchObject({ detected: true })
    expect(
      evaluateCoverageCondition({
        upcomingCount,
        uncoveredCount: boundary - 1,
      }),
    ).toMatchObject({ detected: false, reason: 'covered' })
  })

  it('reports zero uncovered as covered', () => {
    expect(
      evaluateCoverageCondition({ upcomingCount: 128, uncoveredCount: 0 }),
    ).toMatchObject({ detected: false, reason: 'covered' })
  })

  it('reports no_coverage for the Cervantes shape — 129 of 129 uncovered', () => {
    expect(
      evaluateCoverageCondition({ upcomingCount: 129, uncoveredCount: 129 }),
    ).toEqual({
      detected: true,
      condition: 'no_coverage',
      upcomingCount: 129,
      uncoveredCount: 129,
      uncoveredPercent: 100,
    })
  })

  it('reports partial_gap with the raw figures the evidence line needs', () => {
    // The panel states the covered figure (14 - 5 = 9 of 14); detection counts
    // the uncovered one, so both must survive on the result.
    expect(
      evaluateCoverageCondition({ upcomingCount: 14, uncoveredCount: 5 }),
    ).toMatchObject({
      detected: true,
      condition: 'partial_gap',
      upcomingCount: 14,
      uncoveredCount: 5,
    })
  })
})

describe('matchesAcknowledgement', () => {
  const key = (
    condition: string,
    evidenceKind: string | null,
    evidenceValue: string | null,
  ) => ({ condition, evidenceKind, evidenceValue })

  it('suppresses Summit while its pinned count holds at 36', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'pinned_count', '36'),
        key('ceiling', 'pinned_count', '36'),
      ),
    ).toBe(true)
  })

  it('re-fires Summit when the pinned count moves to 41', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'pinned_count', '41'),
        key('ceiling', 'pinned_count', '36'),
      ),
    ).toBe(false)
  })

  it('suppresses Ball Arena while its pinned count holds at 86', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'pinned_count', '86'),
        key('ceiling', 'pinned_count', '86'),
      ),
    ).toBe(true)
  })

  it('re-fires Ball Arena when the pinned count moves to 130', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'pinned_count', '130'),
        key('ceiling', 'pinned_count', '86'),
      ),
    ).toBe(false)
  })

  it('suppresses Red Rocks when next season ends near the same point in the year', () => {
    // Acked 2026-11-15; the 2027 season ends six days earlier. Comparing the
    // raw dates would read ~359 days and re-fire every single year, which is
    // the entire reason the match is on position in the annual cycle.
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2027-11-09'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(true)
  })

  it('re-fires Red Rocks when the horizon collapses mid-season', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2026-09-02'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(false)
  })

  it('re-fires Red Rocks when the horizon drifts into the next January', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2027-01-20'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(false)
  })

  it('matches a date in the acknowledged year itself, not only shifted years', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2026-11-30'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(true)
  })

  it('matches a date two years on, since every year lands on the same position', () => {
    // The candidate set is {y-1, y, y+1} relative to the *current* date's year,
    // so the acknowledged 2026-11-15 is reached from 2028 via 2028-11-15.
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2028-11-20'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(true)
  })

  it('suppresses at exactly the tolerance boundary', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2026-12-30'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(true)
  })

  it('re-fires one day past the tolerance boundary', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2026-12-31'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(false)
  })

  it('clamps a Feb 29 acknowledgement to Feb 28 in a non-leap year', () => {
    // Substituting 2027 into 2028-02-29 yields an invalid date that Date.parse
    // silently rolls to March 1, shifting the comparison by a day.
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2027-02-28'),
        key('ceiling', 'horizon_shrank', '2028-02-29'),
      ),
    ).toBe(true)
  })

  it('does not suppress a different condition on the same venue', () => {
    // A seasonal venue acked for its autumn ceiling still reports going dark
    // in winter — same underlying reason, different fault, still worth seeing.
    expect(
      matchesAcknowledgement(
        key('wentDark', null, '0'),
        key('ceiling', 'pinned_count', '36'),
      ),
    ).toBe(false)
  })

  it('does not suppress a different evidence kind within ceiling', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '36'),
        key('ceiling', 'pinned_count', '36'),
      ),
    ).toBe(false)
  })

  it('suppresses wentDark at the acknowledged usable count', () => {
    expect(
      matchesAcknowledgement(
        key('wentDark', null, '0'),
        key('wentDark', null, '0'),
      ),
    ).toBe(true)
  })

  it('suppresses coverage at the acknowledged uncovered count', () => {
    expect(
      matchesAcknowledgement(
        key('coverage', null, '129'),
        key('coverage', null, '129'),
      ),
    ).toBe(true)
  })

  it('suppresses failed at the acknowledged error class', () => {
    expect(
      matchesAcknowledgement(
        key('failed', null, 'timeout'),
        key('failed', null, 'timeout'),
      ),
    ).toBe(true)
  })

  it('re-fires failed when the error class changes', () => {
    expect(
      matchesAcknowledgement(
        key('failed', null, 'dns'),
        key('failed', null, 'timeout'),
      ),
    ).toBe(false)
  })

  it('suppresses blocked when both the acknowledged and current status are absent', () => {
    expect(
      matchesAcknowledgement(
        key('blocked', null, null),
        key('blocked', null, null),
      ),
    ).toBe(true)
  })

  it('re-fires blocked when a status appears against a null acknowledgement', () => {
    expect(
      matchesAcknowledgement(
        key('blocked', null, '403'),
        key('blocked', null, null),
      ),
    ).toBe(false)
  })

  it('re-fires blocked when the status disappears against a recorded one', () => {
    expect(
      matchesAcknowledgement(
        key('blocked', null, null),
        key('blocked', null, '403'),
      ),
    ).toBe(false)
  })

  it('fails closed on an unparseable acknowledged date', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', '2026-11-15'),
        key('ceiling', 'horizon_shrank', 'not-a-date'),
      ),
    ).toBe(false)
  })

  it('fails closed on an unparseable current date', () => {
    expect(
      matchesAcknowledgement(
        key('ceiling', 'horizon_shrank', 'whenever'),
        key('ceiling', 'horizon_shrank', '2026-11-15'),
      ),
    ).toBe(false)
  })
})
