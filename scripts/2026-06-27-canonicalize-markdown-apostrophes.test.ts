import { describe, it, expect } from 'vitest'
import {
  chunk,
  planUserEventDedup,
  selectCollapseClusters,
  type UserEventRow,
} from './2026-06-27-canonicalize-markdown-apostrophes-helpers.js'

const WINNER = 'winner-event'
const LOSER_A = 'loser-a'
const LOSER_B = 'loser-b'
const LOSER_C = 'loser-c'

function makeRow(
  id: string,
  userId: string,
  eventId: string,
  createdAt: Date = new Date('2026-01-01T00:00:00Z'),
): UserEventRow {
  return { id, userId, eventId, createdAt }
}

describe('planUserEventDedup', () => {
  it('returns an empty plan when no rows touch the cluster', () => {
    const plan = planUserEventDedup([], WINNER)
    expect(plan.rowIdsToDelete).toEqual([])
    expect(plan.rowIdsToRedirect).toEqual([])
  })

  it('redirects a single loser row when the user has no winner row', () => {
    // Baseline — one user, one row on a loser, plan is a single redirect.
    const plan = planUserEventDedup(
      [makeRow('row-1', 'user-1', LOSER_A)],
      WINNER,
    )
    expect(plan.rowIdsToRedirect).toEqual(['row-1'])
    expect(plan.rowIdsToDelete).toEqual([])
  })

  it('deletes a loser row when the user already watches the winner', () => {
    // Original Copilot-cited case the script already handled: a single
    // loser row by a user whose watch row on the winner already exists.
    const plan = planUserEventDedup(
      [
        makeRow('row-winner', 'user-1', WINNER),
        makeRow('row-loser', 'user-1', LOSER_A),
      ],
      WINNER,
    )
    expect(plan.rowIdsToRedirect).toEqual([])
    expect(plan.rowIdsToDelete).toEqual(['row-loser'])
  })

  it('handles the multi-loser-watches-by-same-user case (the #855 R1 bug)', () => {
    // The regression Copilot flagged: one user has watch rows on TWO
    // losers in the same cluster and NO row on the winner. Old code
    // would redirect both → second UPDATE violates UNIQUE(user, winner).
    // New behavior: redirect one (earliest by createdAt), delete the rest.
    const plan = planUserEventDedup(
      [
        makeRow('row-a', 'user-1', LOSER_A, new Date('2026-01-01T00:00:00Z')),
        makeRow('row-b', 'user-1', LOSER_B, new Date('2026-01-02T00:00:00Z')),
      ],
      WINNER,
    )
    expect(plan.rowIdsToRedirect).toEqual(['row-a'])
    expect(plan.rowIdsToDelete).toEqual(['row-b'])
  })

  it('handles multi-loser AND winner-side row for same user', () => {
    // Maximal collision: user watches the winner AND two losers. Keep
    // the winner-side row (no UPDATE needed), delete both loser rows.
    const plan = planUserEventDedup(
      [
        makeRow('row-winner', 'user-1', WINNER),
        makeRow('row-loser-a', 'user-1', LOSER_A),
        makeRow('row-loser-b', 'user-1', LOSER_B),
      ],
      WINNER,
    )
    expect(plan.rowIdsToRedirect).toEqual([])
    expect(plan.rowIdsToDelete.sort()).toEqual(['row-loser-a', 'row-loser-b'])
  })

  it('handles three losers for one user with no winner row', () => {
    // Even broader collision shape — promote the earliest, delete the rest.
    const plan = planUserEventDedup(
      [
        makeRow('row-a', 'user-1', LOSER_A, new Date('2026-01-03T00:00:00Z')),
        makeRow('row-b', 'user-1', LOSER_B, new Date('2026-01-01T00:00:00Z')),
        makeRow('row-c', 'user-1', LOSER_C, new Date('2026-01-02T00:00:00Z')),
      ],
      WINNER,
    )
    expect(plan.rowIdsToRedirect).toEqual(['row-b'])
    expect(plan.rowIdsToDelete.sort()).toEqual(['row-a', 'row-c'])
  })

  it('isolates per-user planning — different users plan independently', () => {
    // user-1 already on winner → loser row deletes
    // user-2 on two losers → earliest redirects, other deletes
    // user-3 on one loser → redirects
    const plan = planUserEventDedup(
      [
        makeRow('u1-winner', 'user-1', WINNER),
        makeRow('u1-loser', 'user-1', LOSER_A),
        makeRow('u2-a', 'user-2', LOSER_A, new Date('2026-02-01T00:00:00Z')),
        makeRow('u2-b', 'user-2', LOSER_B, new Date('2026-02-02T00:00:00Z')),
        makeRow('u3-only', 'user-3', LOSER_B),
      ],
      WINNER,
    )
    expect(plan.rowIdsToRedirect.sort()).toEqual(['u2-a', 'u3-only'])
    expect(plan.rowIdsToDelete.sort()).toEqual(['u1-loser', 'u2-b'])
  })

  it('uses id as a stable tiebreak when createdAt ties', () => {
    // Two losers, identical createdAt — the lowest id wins to keep the
    // plan deterministic across operator machines / re-runs.
    const sameTime = new Date('2026-01-01T00:00:00Z')
    const plan = planUserEventDedup(
      [
        makeRow('row-zzz', 'user-1', LOSER_A, sameTime),
        makeRow('row-aaa', 'user-1', LOSER_B, sameTime),
      ],
      WINNER,
    )
    expect(plan.rowIdsToRedirect).toEqual(['row-aaa'])
    expect(plan.rowIdsToDelete).toEqual(['row-zzz'])
  })
})

describe('selectCollapseClusters', () => {
  // Minimal row shape — just enough fields for the helper to evaluate
  // "did the new normalizer change anything in this bucket?". Mirrors
  // the structural CanonicalChangeRow interface.
  function makeBucketRow(stored: string, computed: string) {
    return { storedCanonical: stored, computedCanonical: computed }
  }

  it('returns an empty map for empty input', () => {
    const out = selectCollapseClusters(new Map())
    expect(out.size).toBe(0)
  })

  it('skips single-row buckets (no collision precondition)', () => {
    const buckets = new Map([
      ['venue-1|2026-07-01|x', [makeBucketRow('old-canonical', 'x')]],
    ])
    const out = selectCollapseClusters(buckets)
    expect(out.size).toBe(0)
  })

  it("skips clusters where no row's canonical_title would change", () => {
    // Pre-existing collision: both rows already share the same stored
    // canonical AND the new normalizer would produce the same value.
    // Out of scope for #850 — would be silently swept otherwise.
    const buckets = new Map([
      [
        'venue-1|2026-07-01|x',
        [makeBucketRow('x', 'x'), makeBucketRow('x', 'x')],
      ],
    ])
    const out = selectCollapseClusters(buckets)
    expect(out.size).toBe(0)
  })

  it('processes clusters where at least one row recomputes to a new canonical', () => {
    // The script's target case: row A's stored canonical was the old
    // (unnormalized) variant, row B's was already the normalized form.
    // The new normalizer would change A's canonical → they collide.
    const bucket = [
      makeBucketRow('zeds dead jamboree!', 'zeds dead jamboree!'),
      makeBucketRow("zed's dead jamboree!", 'zeds dead jamboree!'),
    ]
    const buckets = new Map([
      ['venue-1|2026-07-01|zeds dead jamboree!', bucket],
    ])
    const out = selectCollapseClusters(buckets)
    expect(out.size).toBe(1)
    expect(out.get('venue-1|2026-07-01|zeds dead jamboree!')).toBe(bucket)
  })

  it('processes clusters where every row recomputes (both stored values stale)', () => {
    // Edge case: both rows had the old un-normalized stored canonical
    // AND both recompute to the same new value. Still in scope —
    // the new normalizer is what produces the collision.
    const bucket = [
      makeBucketRow('old-a', 'new-x'),
      makeBucketRow('old-b', 'new-x'),
    ]
    const buckets = new Map([['venue-1|2026-07-01|new-x', bucket]])
    const out = selectCollapseClusters(buckets)
    expect(out.size).toBe(1)
  })

  it('keeps qualifying clusters and skips pre-existing ones in a mixed input', () => {
    // Realistic mix: one cluster the new normalizer creates, one
    // pre-existing dupe. Helper must keep the first and skip the
    // second.
    const qualifying = [
      makeBucketRow('old-stored', 'new-x'),
      makeBucketRow('new-x', 'new-x'),
    ]
    const preExisting = [makeBucketRow('y', 'y'), makeBucketRow('y', 'y')]
    const buckets = new Map<string, ReturnType<typeof makeBucketRow>[]>([
      ['venue-1|2026-07-01|new-x', qualifying],
      ['venue-1|2026-07-02|y', preExisting],
    ])
    const out = selectCollapseClusters(buckets)
    expect(out.size).toBe(1)
    expect(out.has('venue-1|2026-07-01|new-x')).toBe(true)
    expect(out.has('venue-1|2026-07-02|y')).toBe(false)
  })
})

describe('chunk', () => {
  it('returns empty array for empty input', () => {
    expect(chunk([], 10)).toEqual([])
  })

  it('returns a single batch when input fits', () => {
    const items = [1, 2, 3]
    expect(chunk(items, 10)).toEqual([[1, 2, 3]])
  })

  it('splits into fixed-size batches with a smaller trailing batch', () => {
    // 7 items / batch=3 → [3, 3, 1]
    const items = [1, 2, 3, 4, 5, 6, 7]
    expect(chunk(items, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('splits cleanly when length is a multiple of size', () => {
    const items = [1, 2, 3, 4]
    expect(chunk(items, 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('throws on non-positive chunk size', () => {
    // Defensive guard — a zero-size chunk would loop forever.
    expect(() => chunk([1], 0)).toThrow(/chunk size/)
    expect(() => chunk([1], -1)).toThrow(/chunk size/)
  })
})
