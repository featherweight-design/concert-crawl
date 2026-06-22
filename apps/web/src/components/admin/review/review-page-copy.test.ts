import { describe, it, expect } from 'vitest'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

describe('reviewPageClient mobile subtitle (#711)', () => {
  const subtitle = ADMIN_COPY.review.reviewPageClient.mobileSubtitle

  // The header pill ("X pending") and the mobile subtitle both account for
  // every triage tab — Event Flags + Prices + Missing. This test pins the
  // breakdown so a future caller can't accidentally drop the missing count.
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
