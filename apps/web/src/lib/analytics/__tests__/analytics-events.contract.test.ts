import { describe, expect, it } from 'vitest'
import type { ShareCardRatio, ShareCardTheme } from '@concert-crawl/types'
import { SHARE_RATIOS } from '@/components/consumer/share/definitions/ratios'
import type { ShareRatio } from '@/components/consumer/share/definitions/ratios'
import { THEMES } from '@/theme/themes'
import type { ThemeName } from '@/theme/themes'

/**
 * `packages/types` cannot import from `apps/web`, so the share analytics
 * contract mirrors `ShareRatio` and `ThemeName` as its own closed unions. These
 * assertions are the thing that stops the copies drifting: they check both
 * directions, so adding a shape or a theme in the app without widening the
 * contract is a typecheck failure here rather than an unmodelled value landing
 * in PostHog.
 */
const ratioIsExhaustive: ShareCardRatio extends ShareRatio
  ? ShareRatio extends ShareCardRatio
    ? true
    : never
  : never = true

const themeIsExhaustive: ShareCardTheme extends ThemeName
  ? ThemeName extends ShareCardTheme
    ? true
    : never
  : never = true

describe('share analytics contract', () => {
  it('models exactly the share shapes the app offers', () => {
    expect(ratioIsExhaustive).toBe(true)
    // The runtime half: the type assertion above cannot see a tuple shrinking
    // without its type changing, and this names the count that is modelled.
    expect([...SHARE_RATIOS].sort()).toEqual(['link', 'square', 'story'])
  })

  it('models exactly the themes a poster can be drawn in', () => {
    expect(themeIsExhaustive).toBe(true)
    expect(Object.keys(THEMES)).toHaveLength(9)
  })
})
