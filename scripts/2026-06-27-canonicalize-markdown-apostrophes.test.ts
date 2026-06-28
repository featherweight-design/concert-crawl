import { describe, it, expect } from 'vitest'
import {
  chunk,
  planUserEventDedup,
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
