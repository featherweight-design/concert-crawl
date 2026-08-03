import { describe, expect, it } from 'vitest'
import {
  PP_MODES,
  PASSPORT_PRINT_MODE,
  PASSPORT_PRINT_SCALE,
  scalePassportMode,
} from '../definitions/modes'
import { PASSPORT_DIMENSIONS } from '@/lib/passport/passport-request'

describe('scalePassportMode', () => {
  it('multiplies every length so the proportions are untouched', () => {
    const base = PP_MODES.share
    const scaled = scalePassportMode(base, 2)

    expect(scaled.width).toBe(base.width * 2)
    expect(scaled.pad).toBe(base.pad * 2)
    expect(scaled.statBig).toBe(base.statBig * 2)
    expect(scaled.hairline).toBe(base.hairline * 2)
    // The wall arithmetic in PassportCard divides by these, so a scaled tile
    // has to land on the same fraction of the card as an unscaled one.
    expect((scaled.width - scaled.pad * 2) / (base.width - base.pad * 2)).toBe(
      2,
    )
  })

  // Scaling the grid would silently change how many shows the card surfaces,
  // and scaling an opacity would drive it past 1.
  it('leaves the counts and the grain alone', () => {
    const scaled = scalePassportMode(PP_MODES.share, 2)

    expect(scaled.cols).toBe(PP_MODES.share.cols)
    expect(scaled.rows).toBe(PP_MODES.share.rows)
    expect(scaled.grain).toBe(PP_MODES.share.grain)
  })

  it('is a no-op at 1', () => {
    expect(scalePassportMode(PP_MODES.compact, 1)).toEqual(PP_MODES.compact)
  })
})

describe('PASSPORT_DIMENSIONS', () => {
  // The PNG is drawn at a multiple of the design size and displayed at 1×; an
  // artboard that disagreed with the card would crop it or frame it in dead
  // space.
  it('matches the print card at the print scale', () => {
    const card = PP_MODES[PASSPORT_PRINT_MODE]

    expect(PASSPORT_DIMENSIONS.square).toEqual({
      width: card.width * PASSPORT_PRINT_SCALE,
      height: card.height * PASSPORT_PRINT_SCALE,
    })
  })

  it('renders above the 1080 the design is drawn at', () => {
    expect(PASSPORT_DIMENSIONS.square.width).toBeGreaterThan(1080)
  })
})
