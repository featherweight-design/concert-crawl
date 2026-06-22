import { describe, it, expect } from 'vitest'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

describe('reviewPageClient mobile subtitle (#711)', () => {
  const subtitle = ADMIN_COPY.review.reviewPageClient.mobileSubtitle

  // Pins the mobile-subtitle copy: event/price/missing breakdown with
  // pluralization. The header-pill formula has its own coverage in
  // review-pending.test.ts (lib/admin/review-pending.ts).
  it('includes event, price, and missing counts in the breakdown', () => {
    expect(subtitle(3, 2, 5)).toBe('3 events · 2 prices · 5 missing waiting.')
  })

  it('uses singular event/price labels when count is 1', () => {
    expect(subtitle(1, 1, 1)).toBe('1 event · 1 price · 1 missing waiting.')
  })

  it('pluralises 0 (zero events/prices) — same as N != 1', () => {
    expect(subtitle(0, 0, 0)).toBe('0 events · 0 prices · 0 missing waiting.')
  })
})
