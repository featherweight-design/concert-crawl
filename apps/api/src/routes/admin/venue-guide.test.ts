import { describe, it, expect } from 'vitest'
import { saveGuideSchema } from './venue-guide.js'

describe('saveGuideSchema (#764)', () => {
  it('trims the insider tip and nulls an empty one', () => {
    const trimmed = saveGuideSchema.safeParse({
      insiderTip: '  Runs loud.  ',
      chips: [],
    })
    expect(trimmed.success).toBe(true)
    expect(trimmed.success && trimmed.data.insiderTip).toBe('Runs loud.')

    const blank = saveGuideSchema.safeParse({ insiderTip: '   ', chips: [] })
    expect(blank.success && blank.data.insiderTip).toBeNull()
  })

  it('defaults isPlaceholder to false', () => {
    const parsed = saveGuideSchema.safeParse({
      chips: [{ chipType: 'parking', body: '$15 cash.' }],
    })
    expect(parsed.success && parsed.data.chips[0]?.isPlaceholder).toBe(false)
  })

  it('rejects a chip key outside GUIDE_CHIP_ORDER', () => {
    // The design prototype's short keys are display-only; there is no
    // mapping layer, so they must fail validation.
    for (const chipType of ['age', 'bag', 'coat', 'entry', 'food', 'weather']) {
      expect(
        saveGuideSchema.safeParse({ chips: [{ chipType, body: 'x' }] }).success,
      ).toBe(false)
    }
  })

  it('rejects a duplicate chipType', () => {
    const parsed = saveGuideSchema.safeParse({
      chips: [
        { chipType: 'parking', body: 'Lot A' },
        { chipType: 'parking', body: 'Lot B' },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects isPlaceholder on a non-accessibility chip', () => {
    const parsed = saveGuideSchema.safeParse({
      chips: [{ chipType: 'parking', body: '', isPlaceholder: true }],
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts isPlaceholder on accessibility', () => {
    const parsed = saveGuideSchema.safeParse({
      chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a body over 400 characters', () => {
    const parsed = saveGuideSchema.safeParse({
      chips: [{ chipType: 'parking', body: 'x'.repeat(401) }],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects more chips than the pool holds', () => {
    const parsed = saveGuideSchema.safeParse({
      chips: Array.from({ length: 9 }, () => ({
        chipType: 'parking',
        body: 'x',
      })),
    })
    expect(parsed.success).toBe(false)
  })
})
