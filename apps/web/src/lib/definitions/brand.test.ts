import { describe, it, expect } from 'vitest'

import { BRAND_PAPER } from './brand'
import { THEMES } from '@/theme/themes'

describe('BRAND_PAPER', () => {
  // The manifest, the browser theme colour and the social card all paint this
  // outside CSS, so it cannot be read from a custom property. That makes it a
  // second copy of a value the theme table already holds, and a second copy
  // that nothing checks is a second copy that drifts.
  it('agrees with the electric theme background the app paints', () => {
    expect(BRAND_PAPER.toLowerCase()).toBe(THEMES.electric.bg?.toLowerCase())
  })
})
