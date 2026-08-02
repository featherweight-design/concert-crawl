import { describe, it, expect } from 'vitest'
import {
  GUIDE_CHIP_ORDER,
  GUIDE_CHIP_V2_KEYS,
  isGuideChipKey,
  deriveChipState,
  deriveGuidePublishState,
  resolveGuideViewerMode,
  deriveGuideDensity,
  type VenueGuideChip,
} from './venue-guide.js'

describe('GUIDE_CHIP_ORDER', () => {
  it('pins accessibility first', () => {
    expect(GUIDE_CHIP_ORDER[0]).toBe('accessibility')
  })

  it('holds the eight v1 chip keys with no duplicates', () => {
    expect(GUIDE_CHIP_ORDER).toEqual([
      'accessibility',
      'parking',
      'age_policy',
      'bag_check',
      'coat_check',
      'will_call',
      'food_drink',
      'transit',
    ])
    expect(new Set(GUIDE_CHIP_ORDER).size).toBe(GUIDE_CHIP_ORDER.length)
  })

  it('shares no keys with the v2 pool', () => {
    for (const key of GUIDE_CHIP_V2_KEYS) {
      expect(GUIDE_CHIP_ORDER).not.toContain(key)
    }
  })
})

describe('isGuideChipKey', () => {
  it('accepts every canonical key', () => {
    for (const key of GUIDE_CHIP_ORDER) {
      expect(isGuideChipKey(key)).toBe(true)
    }
  })

  it("rejects the design prototype's short keys — there is no mapping layer", () => {
    for (const shortKey of ['age', 'bag', 'coat', 'entry', 'food']) {
      expect(isGuideChipKey(shortKey)).toBe(false)
    }
  })

  it('rejects every v2 key (#997 is not authorable yet)', () => {
    for (const key of GUIDE_CHIP_V2_KEYS) {
      expect(isGuideChipKey(key)).toBe(false)
    }
  })

  it('rejects unrelated strings', () => {
    expect(isGuideChipKey('')).toBe(false)
    expect(isGuideChipKey('Accessibility')).toBe(false)
    expect(isGuideChipKey('toString')).toBe(false)
  })

  it('narrows the value for the compiler', () => {
    const raw: string = 'parking'
    if (isGuideChipKey(raw)) {
      const narrowed: (typeof GUIDE_CHIP_ORDER)[number] = raw
      expect(narrowed).toBe('parking')
    } else {
      throw new Error('expected parking to narrow')
    }
  })
})

describe('deriveChipState', () => {
  it('treats a missing row as blank', () => {
    expect(deriveChipState(undefined)).toBe('blank')
  })

  it('treats an empty body as blank', () => {
    expect(deriveChipState({ body: '', isPlaceholder: false })).toBe('blank')
  })

  it('treats a whitespace-only body as blank', () => {
    expect(deriveChipState({ body: '   \n\t ', isPlaceholder: false })).toBe(
      'blank',
    )
  })

  it('treats a non-empty body as authored', () => {
    expect(
      deriveChipState({
        body: 'Paid lot on Blake, $15 cash.',
        isPlaceholder: false,
      }),
    ).toBe('authored')
  })

  it('lets isPlaceholder win over an empty body', () => {
    expect(deriveChipState({ body: '', isPlaceholder: true })).toBe(
      'honest_placeholder',
    )
  })

  it('lets isPlaceholder win over an authored body', () => {
    expect(deriveChipState({ body: 'some body', isPlaceholder: true })).toBe(
      'honest_placeholder',
    )
  })
})

describe('deriveGuidePublishState', () => {
  it('is ready when accessibility is authored', () => {
    expect(
      deriveGuidePublishState({
        accessibilityBody: 'Step-free entrance on the north side.',
        accessibilityPlaceholder: false,
      }),
    ).toEqual({ kind: 'ready' })
  })

  it('is ready_with_placeholder when the honest placeholder is set', () => {
    expect(
      deriveGuidePublishState({
        accessibilityBody: '',
        accessibilityPlaceholder: true,
      }),
    ).toEqual({ kind: 'ready_with_placeholder' })
  })

  it('is ready_with_placeholder even when a body is present alongside the flag', () => {
    expect(
      deriveGuidePublishState({
        accessibilityBody: 'leftover draft text',
        accessibilityPlaceholder: true,
      }),
    ).toEqual({ kind: 'ready_with_placeholder' })
  })

  it('is blocked when accessibility is empty', () => {
    expect(
      deriveGuidePublishState({
        accessibilityBody: '',
        accessibilityPlaceholder: false,
      }),
    ).toEqual({ kind: 'blocked', reason: 'accessibility_required' })
  })

  it('is blocked when accessibility is whitespace only', () => {
    expect(
      deriveGuidePublishState({
        accessibilityBody: '   ',
        accessibilityPlaceholder: false,
      }),
    ).toEqual({ kind: 'blocked', reason: 'accessibility_required' })
  })
})

describe('resolveGuideViewerMode', () => {
  it('resolves anonymous visitors to first_timer', () => {
    expect(
      resolveGuideViewerMode({ isSignedIn: false, hasAttendedVenue: null }),
    ).toBe('first_timer')
    expect(
      resolveGuideViewerMode({ isSignedIn: false, hasAttendedVenue: false }),
    ).toBe('first_timer')
  })

  it('resolves an anonymous visitor with a stale true flag to first_timer', () => {
    // We never claim attendance for someone we cannot identify.
    expect(
      resolveGuideViewerMode({ isSignedIn: false, hasAttendedVenue: true }),
    ).toBe('first_timer')
  })

  it('resolves signed-in + unknown history to first_timer (pre-#70 default)', () => {
    // null means "detection not wired". The handoff README says everyone sees
    // the collapsed returner state pre-detection; that is inverted and this
    // assertion is the guard against re-introducing it.
    expect(
      resolveGuideViewerMode({ isSignedIn: true, hasAttendedVenue: null }),
    ).toBe('first_timer')
  })

  it('resolves signed-in + no attendance to first_timer', () => {
    expect(
      resolveGuideViewerMode({ isSignedIn: true, hasAttendedVenue: false }),
    ).toBe('first_timer')
  })

  it('resolves signed-in + attendance to returner', () => {
    expect(
      resolveGuideViewerMode({ isSignedIn: true, hasAttendedVenue: true }),
    ).toBe('returner')
  })
})

describe('deriveGuideDensity', () => {
  const accessibility: VenueGuideChip = {
    chipType: 'accessibility',
    body: 'Step-free entrance around the side on 13th.',
    isPlaceholder: false,
  }
  const parking: VenueGuideChip = {
    chipType: 'parking',
    body: 'Paid lot on Blake, $15 cash.',
    isPlaceholder: false,
  }

  it('is thin when accessibility is the only chip and there is no insider tip', () => {
    expect(
      deriveGuideDensity({ chips: [accessibility], insiderTip: null }),
    ).toBe('thin')
  })

  it('is thin when the insider tip is whitespace only', () => {
    expect(
      deriveGuideDensity({ chips: [accessibility], insiderTip: '   ' }),
    ).toBe('thin')
  })

  it('is thin when accessibility is an honest placeholder and nothing else exists', () => {
    expect(
      deriveGuideDensity({
        chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
        insiderTip: null,
      }),
    ).toBe('thin')
  })

  it('is thin when there are no chips at all', () => {
    expect(deriveGuideDensity({ chips: [], insiderTip: null })).toBe('thin')
  })

  it('is populated when accessibility is joined by an insider tip', () => {
    expect(
      deriveGuideDensity({
        chips: [accessibility],
        insiderTip: 'Roxy runs loud — grab earplugs at the bar.',
      }),
    ).toBe('populated')
  })

  it('is populated when a second chip is authored', () => {
    expect(
      deriveGuideDensity({ chips: [accessibility, parking], insiderTip: null }),
    ).toBe('populated')
  })
})
