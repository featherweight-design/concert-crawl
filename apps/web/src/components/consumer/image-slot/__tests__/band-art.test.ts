import { describe, expect, it } from 'vitest'
import {
  BAND_ART_MAX_OPACITY,
  BAND_GROUND_LUMINANCE_CEILING,
  bandArtOpacity,
} from '../lib/band-art'
import { IA_PALETTES, ia_isDark } from '../../identity-art/IdentityArt'

const BAND_BG = '#070a1a'

const channel = (srgb: number) => {
  const unit = srgb / 255
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}
const rgb = (hex: string) => {
  const num = parseInt(hex.slice(1), 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255] as const
}
const compositeLuminance = (art: string, alpha: number) => {
  const [ar, ag, ab] = rgb(art)
  const [br, bg, bb] = rgb(BAND_BG)
  const mix = (aa: number, bbb: number) => aa * alpha + bbb * (1 - alpha)
  return (
    0.2126 * channel(mix(ar, br)) +
    0.7152 * channel(mix(ag, bg)) +
    0.0722 * channel(mix(ab, bb))
  )
}
const contrast = (text: string, ground: number) => {
  const [rr, gg, bb] = rgb(text)
  const lt = 0.2126 * channel(rr) + 0.7152 * channel(gg) + 0.0722 * channel(bb)
  const [hi, lo] = lt > ground ? [lt, ground] : [ground, lt]
  return (hi + 0.05) / (lo + 0.05)
}

describe('bandArtOpacity', () => {
  it('leaves a dark-ground palette at the tuned value', () => {
    for (const palette of IA_PALETTES.filter((pal) => ia_isDark(pal.bg))) {
      expect(bandArtOpacity(palette.bg)).toBe(BAND_ART_MAX_OPACITY)
    }
  })

  // The defect this function exists for: four of the eight palettes carry a
  // light ground, and at the tuned opacity they washed the band out to the
  // point that the supporting-artist line measured 1.75:1.
  it('pulls every light-ground palette under the luminance ceiling', () => {
    const light = IA_PALETTES.filter((pal) => !ia_isDark(pal.bg))
    expect(light.length).toBeGreaterThan(0)
    for (const palette of light) {
      const alpha = bandArtOpacity(palette.bg)
      expect(alpha).toBeLessThan(BAND_ART_MAX_OPACITY)
      expect(compositeLuminance(palette.bg, alpha)).toBeLessThanOrEqual(
        BAND_GROUND_LUMINANCE_CEILING,
      )
    }
  })

  // The ceiling is not an arbitrary number — it is the point where the
  // smallest text the band draws over artwork still clears AA.
  it('holds --fg-muted at 4.5:1 on every palette', () => {
    for (const palette of IA_PALETTES) {
      const ground = compositeLuminance(palette.bg, bandArtOpacity(palette.bg))
      expect(contrast('#9aa8c7', ground)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('falls back to the tuned value on an unparseable colour', () => {
    expect(bandArtOpacity('not-a-colour')).toBe(BAND_ART_MAX_OPACITY)
    expect(bandArtOpacity('#ECE6D2', 'nonsense')).toBe(BAND_ART_MAX_OPACITY)
  })
})
