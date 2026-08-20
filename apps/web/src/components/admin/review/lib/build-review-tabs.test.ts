import { describe, expect, it } from 'vitest'
import { buildReviewTabs } from './build-review-tabs'
import { computePendingCount } from '@/lib/admin/review-pending'
import { REVIEW_TAB_KEYS } from '@/lib/admin/review-tabs'
import { type ReviewCounts } from '@/lib/queries/use-admin-review'

const counts: ReviewCounts = {
  eventFlags: 3,
  prices: 7,
  missing: 11,
  priceContests: 5,
}

const isCountsField = (key: string): key is keyof ReviewCounts => key in counts

describe('buildReviewTabs', () => {
  it('emits one descriptor per canonical tab key, in canonical order', () => {
    expect(buildReviewTabs(counts).map((tab) => tab.key)).toEqual([
      ...REVIEW_TAB_KEYS,
    ])
  })

  it('puts the pending-submissions count on the submissions tab', () => {
    // #1079 stripped this number from the old combined `Prices` tab because it
    // counted pending submissions while the tab also held price coverage —
    // the pill misread against the label. Post-split the number and the label
    // describe the same thing, so it earns its pill back.
    const submissions = buildReviewTabs(counts).find(
      (tab) => tab.key === 'submissions',
    )
    expect(submissions?.count).toBe(counts.prices)
  })

  it('leaves the price-coverage tab without a count', () => {
    // Coverage has no accurate server count to show (see #1079 / #710) —
    // `priceEventsTotal` depends on the missing-only toggle, so any pill here
    // would be a half-truth.
    const prices = buildReviewTabs(counts).find((tab) => tab.key === 'prices')
    expect(prices?.count).toBeUndefined()
  })

  it('never surfaces the same counts field on two tabs', () => {
    // Lock-step guard: the sidebar Review badge sums eventFlags + prices +
    // missing + priceContests. If the split ever put `prices` on both the
    // coverage and submissions pills, the pills would disagree with the badge.
    // Probed by perturbing one field at a time rather than by comparing the
    // rendered numbers: two fields legitimately holding the same value is not
    // a duplicate wiring, and a value-based check would call it one.
    const base = buildReviewTabs(counts)
    const fields = Object.keys(counts).filter(isCountsField)
    for (const field of fields) {
      const bumped = buildReviewTabs({
        ...counts,
        [field]: counts[field] + 100,
      })
      const moved = base.filter(
        (tab, index) => tab.count !== bumped[index]?.count,
      )
      expect(moved.length).toBeLessThanOrEqual(1)
    }
  })

  it('keeps every pill total within the badge sum', () => {
    const badge = computePendingCount(counts)
    const shown = buildReviewTabs(counts)
      .map((tab) => tab.count ?? 0)
      .reduce((sum, count) => sum + count, 0)
    // Pills are a subset of the badge (Missing and All events show none), so
    // the pills must never exceed it — that would mean a double-count.
    expect(shown).toBeLessThanOrEqual(badge)
  })
})
