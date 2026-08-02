import React from 'react'
import {
  identityFor,
  ia_getInitials,
  ia_isDark,
  ia_pick,
  ia_rngFromHash,
} from './IdentityArt'
import { blendOver, mixHex, rgba, type BlendMode } from './print-color'
import { PRINT_GRAIN_PNG, PRINT_GRAIN_TILE_PX } from './print-grain'

// ── Why this file exists ───────────────────────────────────────────
// <IdentityArt /> is a browser component. Satori — the renderer behind
// `next/og`'s ImageResponse — is not a browser: no `mixBlendMode`, no
// `backdropFilter`, no `maskImage`, no SVG <filter> (so no feTurbulence), no
// `preserveAspectRatio="slice"`. IdentityArt uses all of them.
//
// This is its satori-safe sibling. It consumes the SAME `identityFor()` output
// — same hash, palette, template id and rotation — and emits flattened
// geometry. The determinism test in __tests__ is the contract that keeps the
// in-app preview honest about what actually gets sent.

export type PrintKind = 'artist' | 'venue'
export type PrintScale = 'hero' | 'tile' | 'micro'

type Identity = ReturnType<typeof identityFor>
type Palette = Identity['palette']

const PRINT_VIEWPORT = 400

export interface IdentityArtPrintProps {
  name: string
  /** There is no `'event'` kind — both surfaces key off the artist. */
  kind?: PrintKind
  scale?: PrintScale
  /** Explicit pixel size. Satori has no percentage-sized root. */
  width: number
  height: number
  showInitials?: boolean
  initialsBottom?: number
  /** `0` omits the grain layer entirely. */
  grain?: number
  templateOverride?: string
  paletteOverride?: string
  rotateOverride?: 0 | 1 | 2 | 3
  style?: React.CSSProperties
}

// ── Identity resolution (shared with the on-screen component) ──────

/**
 * The identity the print renderer draws. Deliberately a thin pass-through of
 * `identityFor` — the point is that there is exactly one derivation, so the
 * screen preview and the PNG can never disagree.
 */
export const printIdentityFor = (
  name: string,
  kind: PrintKind,
  opts: { templateOverride?: string; paletteOverride?: string } = {},
): Identity => identityFor(name, kind, opts)

export interface PrintInk {
  mode: BlendMode
  /** `palette.primary` pre-composited over `palette.bg`. */
  primary: string
  /** `palette.secondary` pre-composited over `palette.bg`. */
  secondary: string
}

/**
 * Pre-resolve the blend the browser would have done. `screen` on dark paper,
 * `multiply` on light — the same rule as `ia_blend()`.
 *
 * Known compromise: each layer is flattened against the paper, not against
 * whatever layer sits beneath it. Where the primary and secondary passes
 * overlap, the print output is very slightly flatter than the screen version.
 */
export const printInkFor = (palette: Palette): PrintInk => {
  const mode: BlendMode = ia_isDark(palette.bg) ? 'screen' : 'multiply'
  return {
    mode,
    primary: blendOver(palette.primary, palette.bg, mode),
    secondary: blendOver(palette.secondary, palette.bg, mode),
  }
}

interface PrintTemplateArgs {
  rng: () => number
  hash: number
  palette: Palette
  ink: PrintInk
  scale: PrintScale
}

// ── Templates (flattened) ──────────────────────────────────────────

// Satori's SVG subset is narrow enough that a radial gradient is not worth
// betting the whole layer on: if it were dropped, the blobs would silently
// vanish and the poster would just look plainer. Stepped rings reproduce the
// falloff with primitives that cannot be dropped.
const RADIAL_STEPS = 8
// Constant per-ring alpha, stacked outside-in. Cumulative coverage lands near
// 0.86 at the centre and 0.63 at 60% radius, which tracks the screen
// gradient's 0.95 / 0.55 / 0 falloff closely enough to read as the same blob.
const RADIAL_STEP_ALPHA = 0.22

const printMesh = ({
  rng,
  palette,
  ink,
  scale,
}: PrintTemplateArgs): React.ReactElement => {
  const blobCount = scale === 'hero' ? 5 : scale === 'tile' ? 4 : 3
  const blobs = Array.from({ length: blobCount }, (_, idx) => ({
    cx: 60 + rng() * 280,
    cy: 60 + rng() * 280,
    rr: 100 + rng() * 160,
    fill: idx % 2 === 0 ? ink.primary : ink.secondary,
    key: idx,
  }))
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      {blobs.map((blob) => (
        <g key={`blob-${blob.key}`}>
          {Array.from({ length: RADIAL_STEPS }, (_, step) => (
            <circle
              key={`ring-${blob.key}-${step}`}
              cx={blob.cx}
              cy={blob.cy}
              // Outside-in: step 0 is the full-radius ring.
              r={blob.rr * (1 - step / RADIAL_STEPS)}
              fill={rgba(blob.fill, RADIAL_STEP_ALPHA)}
            />
          ))}
        </g>
      ))}
    </g>
  )
}

const printStripes = ({
  rng,
  palette,
  ink,
  scale,
}: PrintTemplateArgs): React.ReactElement => {
  const angle = ia_pick(rng, [0, 30, 45, 60, 90, 120, 135])
  const stripeCount = scale === 'hero' ? 8 : scale === 'tile' ? 6 : 4
  const stripeW = 400 / stripeCount
  const widthMul = 0.55 + rng() * 0.25
  const stripes = Array.from({ length: stripeCount }, (_, idx) => idx)
    .filter((idx) => idx % 2 === 0)
    .map((idx) => ({ xx: idx * stripeW, ww: stripeW * widthMul, key: idx }))
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g transform={`rotate(${angle} 200 200)`}>
        <g transform="translate(6 4)">
          {stripes.map((stripe) => (
            <rect
              key={`s2-${stripe.key}`}
              x={stripe.xx - 80}
              y="-80"
              width={stripe.ww}
              height="560"
              fill={ink.secondary}
            />
          ))}
        </g>
        {stripes.map((stripe) => (
          <rect
            key={`s1-${stripe.key}`}
            x={stripe.xx - 80}
            y="-80"
            width={stripe.ww}
            height="560"
            fill={ink.primary}
          />
        ))}
      </g>
    </g>
  )
}

const printConcentric = ({
  rng,
  palette,
  ink,
  scale,
}: PrintTemplateArgs): React.ReactElement => {
  const focal = ia_pick(rng, [
    { cx: 80, cy: 320 },
    { cx: 320, cy: 80 },
    { cx: 80, cy: 80 },
    { cx: 320, cy: 320 },
    { cx: 200, cy: 200 },
  ])
  const ringCount = scale === 'hero' ? 12 : scale === 'tile' ? 8 : 5
  const stride = 28 + rng() * 14
  const baseStroke = scale === 'hero' ? 6 : 9
  const rings = Array.from({ length: ringCount }, (_, idx) => ({
    rr: 30 + idx * stride,
    sw: baseStroke + (idx % 2 === 0 ? 0 : 2),
    key: idx,
  }))
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g transform="translate(4 3)">
        {rings.map((ring) => (
          <circle
            key={`c2-${ring.key}`}
            cx={focal.cx}
            cy={focal.cy}
            r={ring.rr}
            fill="none"
            stroke={ink.secondary}
            strokeWidth={ring.sw}
          />
        ))}
      </g>
      {rings.map((ring) => (
        <circle
          key={`c1-${ring.key}`}
          cx={focal.cx}
          cy={focal.cy}
          r={ring.rr}
          fill="none"
          stroke={ink.primary}
          strokeWidth={ring.sw}
        />
      ))}
    </g>
  )
}

const printHalftone = ({
  rng,
  palette,
  ink,
  scale,
}: PrintTemplateArgs): React.ReactElement => {
  const corners = [
    { cx: 0, cy: 400 },
    { cx: 400, cy: 400 },
    { cx: 0, cy: 0 },
    { cx: 400, cy: 0 },
  ]
  // `ia_pick` consumes exactly one rng() draw and, for a four-member array,
  // selects identically to the screen template's `Math.floor(rng() * 4)`.
  const corner = ia_pick(rng, corners)
  const massR = 320 + rng() * 80
  const cellSize = scale === 'hero' ? 16 : scale === 'tile' ? 22 : 32
  const cells = Math.ceil(400 / cellSize)
  const dots: { xx: number; yy: number; rr: number; key: string }[] = []
  for (let yi = 0; yi < cells; yi++) {
    for (let xi = 0; xi < cells; xi++) {
      const xx = xi * cellSize + cellSize / 2
      const yy = yi * cellSize + cellSize / 2
      const dx = (xx - corner.cx) / 400
      const dy = (yy - corner.cy) / 400
      const dist = Math.sqrt(dx * dx + dy * dy)
      const rNorm = Math.min(1, Math.max(0, dist * 0.85))
      const dotR = rNorm * (cellSize * 0.48)
      if (dotR > 0.4) dots.push({ xx, yy, rr: dotR, key: `${xi}-${yi}` })
    }
  }
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <circle cx={corner.cx} cy={corner.cy} r={massR} fill={ink.primary} />
      {dots.map((dot) => (
        <circle
          key={dot.key}
          cx={dot.xx}
          cy={dot.yy}
          r={dot.rr}
          fill={ink.secondary}
        />
      ))}
    </g>
  )
}

const printBlueprint = ({
  rng,
  palette,
  ink,
  scale,
}: PrintTemplateArgs): React.ReactElement => {
  const gridStep = scale === 'hero' ? 20 : scale === 'tile' ? 32 : 48
  const lightLines: {
    x1: number
    y1: number
    x2: number
    y2: number
    key: string
  }[] = []
  const heavyLines: {
    x1: number
    y1: number
    x2: number
    y2: number
    key: string
  }[] = []
  for (let vv = gridStep; vv < 400; vv += gridStep) {
    lightLines.push({ x1: vv, y1: 0, x2: vv, y2: 400, key: `vl${vv}` })
    lightLines.push({ x1: 0, y1: vv, x2: 400, y2: vv, key: `hl${vv}` })
  }
  for (let vv = gridStep * 5; vv < 400; vv += gridStep * 5) {
    heavyLines.push({ x1: vv, y1: 0, x2: vv, y2: 400, key: `vh${vv}` })
    heavyLines.push({ x1: 0, y1: vv, x2: 400, y2: vv, key: `hh${vv}` })
  }
  const fpW = 180 + rng() * 100
  const fpH = 140 + rng() * 90
  const fpX = (400 - fpW) / 2 + (rng() - 0.5) * 40
  const fpY = (400 - fpH) / 2 + (rng() - 0.5) * 40
  const stageR = Math.min(fpW, fpH) * (0.18 + rng() * 0.1)
  const stageCx = fpX + fpW * (0.4 + rng() * 0.2)
  const stageCy = fpY + fpH * (0.6 + rng() * 0.25)
  const sweepAngle = ia_pick(rng, [-25, -15, 15, 25])
  const isLight = !ia_isDark(palette.bg)
  const gridStroke = isLight ? 'rgba(25,20,24,0.18)' : 'rgba(241,230,213,0.18)'
  const heavyStroke = isLight ? 'rgba(25,20,24,0.32)' : 'rgba(241,230,213,0.32)'
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      {lightLines.map((ln) => (
        <line
          key={ln.key}
          x1={ln.x1}
          y1={ln.y1}
          x2={ln.x2}
          y2={ln.y2}
          stroke={gridStroke}
          strokeWidth={0.6}
        />
      ))}
      {heavyLines.map((ln) => (
        <line
          key={ln.key}
          x1={ln.x1}
          y1={ln.y1}
          x2={ln.x2}
          y2={ln.y2}
          stroke={heavyStroke}
          strokeWidth={1.2}
        />
      ))}
      <rect
        x={fpX}
        y={fpY}
        width={fpW}
        height={fpH}
        fill="none"
        stroke={ink.secondary}
        strokeWidth={scale === 'hero' ? 4 : 5}
      />
      <rect
        x={fpX + 10}
        y={fpY + 10}
        width={fpW - 20}
        height={fpH - 20}
        fill="none"
        stroke={ink.secondary}
        strokeWidth={1.2}
        strokeDasharray="4 5"
      />
      <circle
        cx={stageCx}
        cy={stageCy}
        r={stageR}
        fill={rgba(ink.primary, 0.85)}
      />
      <circle
        cx={stageCx}
        cy={stageCy}
        r={stageR}
        fill="none"
        stroke={ink.secondary}
        strokeWidth={2}
      />
      <g transform={`rotate(${sweepAngle} ${stageCx} ${stageCy})`}>
        <line
          x1={stageCx}
          y1={stageCy}
          x2={stageCx + 220}
          y2={stageCy}
          stroke={ink.primary}
          strokeWidth={1.5}
          strokeDasharray="2 4"
        />
      </g>
      {scale === 'hero' && (
        <g>
          <line
            x1={fpX}
            y1={fpY + fpH + 16}
            x2={fpX + fpW}
            y2={fpY + fpH + 16}
            stroke={ink.secondary}
            strokeWidth={1.2}
          />
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <line
              key={tick}
              x1={fpX + fpW * tick}
              y1={fpY + fpH + 12}
              x2={fpX + fpW * tick}
              y2={fpY + fpH + 20}
              stroke={ink.secondary}
              strokeWidth={1.2}
            />
          ))}
        </g>
      )}
    </g>
  )
}

const PRINT_TEMPLATES: Record<
  string,
  (args: PrintTemplateArgs) => React.ReactElement
> = {
  mesh: printMesh,
  stripes: printStripes,
  concentric: printConcentric,
  halftone: printHalftone,
  blueprint: printBlueprint,
}

// ── Chip + grain ───────────────────────────────────────────────────

/**
 * The screen chip is a translucent plate over a `backdropFilter` blur. Satori
 * has neither, so the chip is opaque: the same translucent fill resolved
 * against the paper colour.
 */
export const printChipColors = (
  palette: Palette,
): { background: string; color: string } => {
  const dark = ia_isDark(palette.bg)
  return dark
    ? { background: mixHex(palette.bg, '#000000', 0.55), color: '#FFFFFF' }
    : { background: mixHex(palette.bg, '#FFFFFF', 0.78), color: '#15131A' }
}

/**
 * The screen grain multiplies/screens at a fixed opacity; here the blend is
 * baked into the tile's own light/dark speckle and the strength is carried by
 * opacity alone, so the visual weight matches at the default `grain = 0.1`.
 */
export const printGrainOpacity = (grain: number, palette: Palette): number => {
  const strength = Math.max(0, Math.min(1, grain))
  return strength * (ia_isDark(palette.bg) ? 0.55 : 0.85)
}

/**
 * Satori has no `preserveAspectRatio="slice"`, so the cover crop is computed
 * into the viewBox instead: the largest centred window of the 400x400 artboard
 * whose aspect ratio matches the output. Identical result, no unsupported
 * attribute.
 */
export const printCoverViewBox = (width: number, height: number): string => {
  const scale = Math.max(
    width / PRINT_VIEWPORT,
    height / PRINT_VIEWPORT,
    Number.EPSILON,
  )
  const vbW = Math.min(PRINT_VIEWPORT, width / scale)
  const vbH = Math.min(PRINT_VIEWPORT, height / scale)
  const minX = (PRINT_VIEWPORT - vbW) / 2
  const minY = (PRINT_VIEWPORT - vbH) / 2
  return `${minX} ${minY} ${vbW} ${vbH}`
}

// ── <IdentityArtPrint /> ───────────────────────────────────────────

export const IdentityArtPrint = ({
  name,
  kind = 'artist',
  scale = 'hero',
  width,
  height,
  showInitials,
  initialsBottom = 12,
  grain = 0.1,
  templateOverride,
  paletteOverride,
  rotateOverride,
  style,
}: IdentityArtPrintProps) => {
  const resolved = printIdentityFor(name, kind, {
    ...(templateOverride !== undefined && { templateOverride }),
    ...(paletteOverride !== undefined && { paletteOverride }),
  })
  const rot = (rotateOverride != null ? rotateOverride : resolved.rotate) % 4
  const rng = ia_rngFromHash(resolved.hash)
  const ink = printInkFor(resolved.palette)
  const render = PRINT_TEMPLATES[resolved.template.id] ?? printMesh
  const artwork = render({
    rng,
    hash: resolved.hash,
    palette: resolved.palette,
    ink,
    scale,
  })

  const initialsOn = showInitials != null ? showInitials : scale === 'hero'
  const chip = printChipColors(resolved.palette)
  // The chip is authored against the 400px artboard, so it scales with the
  // shorter output edge rather than sitting at a fixed pixel size.
  const chipScale = Math.min(width, height) / PRINT_VIEWPORT
  const chipFontSize = (scale === 'hero' ? 44 : 22) * chipScale
  const grainOpacity = printGrainOpacity(grain, resolved.palette)

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        backgroundColor: resolved.palette.bg,
        ...style,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={printCoverViewBox(width, height)}
      >
        <g transform={`rotate(${rot * 90} 200 200)`}>{artwork}</g>
      </svg>

      {grainOpacity > 0 && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            backgroundImage: `url(${PRINT_GRAIN_PNG})`,
            backgroundRepeat: 'repeat',
            backgroundSize: `${PRINT_GRAIN_TILE_PX}px ${PRINT_GRAIN_TILE_PX}px`,
            opacity: grainOpacity,
          }}
        />
      )}

      {initialsOn && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 12 * chipScale,
            bottom: initialsBottom * chipScale,
            padding: `${(scale === 'hero' ? 6 : 3) * chipScale}px ${
              (scale === 'hero' ? 12 : 8) * chipScale
            }px`,
            borderRadius: (scale === 'hero' ? 10 : 6) * chipScale,
            backgroundColor: chip.background,
            fontWeight: 900,
            fontSize: chipFontSize,
            lineHeight: 1,
            color: chip.color,
          }}
        >
          {ia_getInitials(name)}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          backgroundImage:
            'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)',
        }}
      />
    </div>
  )
}
