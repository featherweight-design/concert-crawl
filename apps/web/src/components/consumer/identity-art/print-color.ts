// Colour arithmetic for the satori-safe print renderer.
//
// Satori supports neither `mixBlendMode` nor `backdropFilter`, so every blend
// the on-screen <IdentityArt /> defers to the compositor has to be resolved to
// an explicit colour here, before it reaches the renderer.

export interface Rgb {
  rr: number
  gg: number
  bb: number
}

const clamp255 = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value)))

/** Parse `#rrggbb`. Returns `null` for anything else — no throwing. */
export const parseHex = (hex: string): Rgb | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) return null
  const num = parseInt(match[1] ?? '', 16)
  return { rr: (num >> 16) & 255, gg: (num >> 8) & 255, bb: num & 255 }
}

export const toHex = ({ rr, gg, bb }: Rgb): string =>
  '#' +
  [rr, gg, bb]
    .map((channel) => clamp255(channel).toString(16).padStart(2, '0'))
    .join('')

export type BlendMode = 'screen' | 'multiply'

const blendChannel = (base: number, layer: number, mode: BlendMode): number =>
  mode === 'multiply'
    ? (base * layer) / 255
    : 255 - ((255 - base) * (255 - layer)) / 255

/**
 * Resolve `layer` composited over `base` with the given blend mode, returning
 * an opaque hex. Drawing that result at alpha `a` over `base` reproduces the
 * browser's `mixBlendMode` + opacity result exactly, for a single layer.
 */
export const blendOver = (
  layer: string,
  base: string,
  mode: BlendMode,
): string => {
  const layerRgb = parseHex(layer)
  const baseRgb = parseHex(base)
  if (!layerRgb || !baseRgb) return layer
  return toHex({
    rr: blendChannel(baseRgb.rr, layerRgb.rr, mode),
    gg: blendChannel(baseRgb.gg, layerRgb.gg, mode),
    bb: blendChannel(baseRgb.bb, layerRgb.bb, mode),
  })
}

/** `#rrggbb` + alpha → `rgba(...)`, which satori does understand. */
export const rgba = (hex: string, alpha: number): string => {
  const rgb = parseHex(hex)
  const safeAlpha = Math.max(0, Math.min(1, alpha))
  if (!rgb) return hex
  return `rgba(${rgb.rr},${rgb.gg},${rgb.bb},${Number(safeAlpha.toFixed(4))})`
}
