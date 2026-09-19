import { ia_isDark } from '../../identity-art/IdentityArt'

/**
 * How much of the generated mark the band may show.
 *
 * Four of the eight palettes carry a LIGHT ground (`#ECE6D2` and friends), and
 * the backdrop paints that ground opaquely. At one fixed opacity the same
 * number therefore produces two different surfaces: barely a tint over a dark
 * palette, and a near-white field over a light one — which is how a band
 * shipped with its supporting-artist line at 1.75:1.
 *
 * So the opacity is not the thing to hold constant. What the reader perceives
 * is how far the band has moved off its own ground, and that is held constant
 * here instead: solve for the alpha that lands the composite at a fixed
 * luminance ceiling, and a light palette gets a smaller number to arrive at
 * the same place. A dark palette cannot exceed the ceiling at any alpha, so it
 * keeps the tuned 0.5 untouched.
 */

/** The tuned value. A dark-ground palette always gets exactly this. */
export const BAND_ART_MAX_OPACITY = 0.5

/**
 * Relative luminance the composited band may reach. Set from the measured
 * table: at this ceiling `--fg-muted` holds 4.5:1 against the band, which is
 * the smallest text the band draws over artwork.
 */
export const BAND_GROUND_LUMINANCE_CEILING = 0.045

const channel = (srgb: number): number => {
  const unit = srgb / 255
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

const parse = (hex: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match?.[1]) return null
  const num = parseInt(match[1], 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

const luminance = ([rr, gg, bb]: [number, number, number]): number =>
  0.2126 * channel(rr) + 0.7152 * channel(gg) + 0.0722 * channel(bb)

/**
 * `bandBg` is the band's own ground — the token the composite sits on, passed
 * in rather than read from the document so this stays pure and testable.
 */
export const bandArtOpacity = (
  paletteBg: string,
  bandBg = '#070a1a',
): number => {
  // A dark ground can only ever move the band a little, so it keeps the tuned
  // value and never pays for this calculation.
  if (ia_isDark(paletteBg)) return BAND_ART_MAX_OPACITY

  const art = parse(paletteBg)
  const band = parse(bandBg)
  if (!art || !band) return BAND_ART_MAX_OPACITY

  // Composite in sRGB because that is what the browser does with `opacity`,
  // then read the luminance of the result rather than interpolating luminance
  // directly — the two are not the same and only the first is what renders.
  const over = (alpha: number): number =>
    luminance([
      art[0] * alpha + band[0] * (1 - alpha),
      art[1] * alpha + band[1] * (1 - alpha),
      art[2] * alpha + band[2] * (1 - alpha),
    ])

  if (over(BAND_ART_MAX_OPACITY) <= BAND_GROUND_LUMINANCE_CEILING) {
    return BAND_ART_MAX_OPACITY
  }

  // Luminance rises monotonically with alpha here, so bisect. Twenty passes
  // resolves finer than the two decimals the value is rounded to.
  let lo = 0
  let hi = BAND_ART_MAX_OPACITY
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2
    if (over(mid) > BAND_GROUND_LUMINANCE_CEILING) hi = mid
    else lo = mid
  }
  // Floor, not round. `lo` is the largest alpha known to sit under the
  // ceiling, and rounding to nearest can hand back a value above it again —
  // which is exactly what it did before a test caught it.
  return Math.floor(lo * 100) / 100
}
