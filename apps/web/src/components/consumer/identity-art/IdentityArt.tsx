import React from 'react'

// ── Types ──────────────────────────────────────────────────────
type Scale = 'hero' | 'tile' | 'micro'
type Kind = 'artist' | 'venue'

interface Palette {
  id: string
  name: string
  bg: string
  primary: string
  secondary: string
  ink: string
}

interface TemplateArgs {
  rng: () => number
  hash: number
  palette: Palette
  scale: Scale
  kind: Kind
}

interface IaTemplate {
  id: string
  label: string
  render: (args: TemplateArgs) => React.ReactElement
  kinds: Kind[]
}

export interface IdentityArtProps {
  name: string
  kind?: Kind
  scale?: Scale
  width?: number
  height?: number
  showInitials?: boolean
  grain?: number
  templateOverride?: string
  paletteOverride?: string
  rotateOverride?: 0 | 1 | 2 | 3
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

// ── Hash ──────────────────────────────────────────────────────
export const ia_hashName = (name: string, namespace: string): number => {
  let hash = 0x811c9dc5 >>> 0
  const str = (namespace || 'x') + ':' + (name || '')
  for (let idx = 0; idx < str.length; idx++) {
    hash = (hash ^ str.charCodeAt(idx)) >>> 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

const ia_rngFromHash = (hash: number): (() => number) => {
  let state = (hash || 1) >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

const ia_pick = <T,>(rng: () => number, arr: T[]): T =>
  arr[Math.floor(rng() * arr.length) % arr.length]!

// ── Perceived luminance ────────────────────────────────────────
export const ia_isDark = (hex: string): boolean => {
  if (!hex) return false
  const match = String(hex).match(/^#([0-9a-f]{6})$/i)
  if (!match) return false
  const num = parseInt(match[1]!, 16)
  const rr = (num >> 16) & 255
  const gg = (num >> 8) & 255
  const bb = num & 255
  return rr * 0.299 + gg * 0.587 + bb * 0.114 < 128
}

const ia_blend = (palette: Palette): React.CSSProperties['mixBlendMode'] =>
  ia_isDark(palette.bg) ? 'screen' : 'multiply'

// ── Palettes ──────────────────────────────────────────────────
export const IA_PALETTES: Palette[] = [
  {
    id: 'p0',
    name: 'fuchsia + cobalt',
    bg: '#F1E6D5',
    primary: '#FF3B95',
    secondary: '#1F3D8A',
    ink: '#191418',
  },
  {
    id: 'p1',
    name: 'tangerine + teal',
    bg: '#F0E5D0',
    primary: '#FF6A24',
    secondary: '#0F8585',
    ink: '#191418',
  },
  {
    id: 'p2',
    name: 'saffron + crimson',
    bg: '#15131A',
    primary: '#FFC53A',
    secondary: '#E5394F',
    ink: '#F1E6D5',
  },
  {
    id: 'p3',
    name: 'mint + plum',
    bg: '#F2EEDF',
    primary: '#5BBE96',
    secondary: '#5A2D60',
    ink: '#191418',
  },
  {
    id: 'p4',
    name: 'ember + aqua',
    bg: '#10131A',
    primary: '#FF5566',
    secondary: '#5DD4D6',
    ink: '#F1E6D5',
  },
  {
    id: 'p5',
    name: 'gold + marine',
    bg: '#0E1A2C',
    primary: '#E8B042',
    secondary: '#5C84D6',
    ink: '#F1E6D5',
  },
  {
    id: 'p6',
    name: 'violet + lime',
    bg: '#1A1226',
    primary: '#A075FF',
    secondary: '#C9F26E',
    ink: '#F1E6D5',
  },
  {
    id: 'p7',
    name: 'cobalt + coral',
    bg: '#ECE6D2',
    primary: '#3A4FBE',
    secondary: '#FF7E5A',
    ink: '#191418',
  },
]

// ── Initials ──────────────────────────────────────────────────
export const ia_getInitials = (name: string, max = 2): string => {
  if (!name) return '??'
  const cleaned = String(name)
    .replace(/[^A-Za-z0-9 &]/g, '')
    .trim()
  if (!cleaned) return '??'
  const stop = /^(the|and|of|for|a|an|&|to|in|on|at)$/i
  const words = cleaned.split(/\s+/).filter((ww) => ww && !stop.test(ww))
  if (words.length === 0) return cleaned.slice(0, max).toUpperCase()
  if (words.length === 1) return words[0]!.slice(0, max).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

// ── Templates ─────────────────────────────────────────────────

const tpl_mesh = ({
  rng,
  hash,
  palette,
  scale,
}: TemplateArgs): React.ReactElement => {
  const blobCount = scale === 'hero' ? 5 : scale === 'tile' ? 4 : 3
  const blobs = Array.from({ length: blobCount }, (_, idx) => ({
    cx: 60 + rng() * 280,
    cy: 60 + rng() * 280,
    rr: 100 + rng() * 160,
    fill: idx % 2 === 0 ? palette.primary : palette.secondary,
    key: idx,
  }))
  const blend = ia_blend(palette)
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g style={{ mixBlendMode: blend }}>
        {blobs.map((blob) => {
          const gid = `mg-${hash.toString(36)}-${blob.key}-${Math.round(blob.cx)}-${Math.round(blob.cy)}`
          return (
            <g key={blob.key}>
              <defs>
                <radialGradient id={gid} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={blob.fill} stopOpacity="0.95" />
                  <stop offset="60%" stopColor={blob.fill} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={blob.fill} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle
                cx={blob.cx}
                cy={blob.cy}
                r={blob.rr}
                fill={`url(#${gid})`}
              />
            </g>
          )
        })}
      </g>
    </g>
  )
}

const tpl_stripes = ({
  rng,
  palette,
  scale,
}: TemplateArgs): React.ReactElement => {
  const angle = ia_pick(rng, [0, 30, 45, 60, 90, 120, 135])
  const stripeCount = scale === 'hero' ? 8 : scale === 'tile' ? 6 : 4
  const stripeW = 400 / stripeCount
  const offsetX = 6
  const offsetY = 4
  const widthMul = 0.55 + rng() * 0.25
  const stripes = Array.from({ length: stripeCount }, (_, idx) => idx)
    .filter((idx) => idx % 2 === 0)
    .map((idx) => ({ xx: idx * stripeW, ww: stripeW * widthMul, key: idx }))
  const blend = ia_blend(palette)
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g transform={`rotate(${angle} 200 200)`}>
        <g
          transform={`translate(${offsetX} ${offsetY})`}
          style={{ mixBlendMode: blend }}
        >
          {stripes.map((stripe) => (
            <rect
              key={`s2-${stripe.key}`}
              x={stripe.xx - 80}
              y="-80"
              width={stripe.ww}
              height="560"
              fill={palette.secondary}
            />
          ))}
        </g>
        <g style={{ mixBlendMode: blend }}>
          {stripes.map((stripe) => (
            <rect
              key={`s1-${stripe.key}`}
              x={stripe.xx - 80}
              y="-80"
              width={stripe.ww}
              height="560"
              fill={palette.primary}
            />
          ))}
        </g>
      </g>
    </g>
  )
}

const tpl_concentric = ({
  rng,
  palette,
  scale,
}: TemplateArgs): React.ReactElement => {
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
  const blend = ia_blend(palette)
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g transform="translate(4 3)" style={{ mixBlendMode: blend }}>
        {rings.map((ring) => (
          <circle
            key={`c2-${ring.key}`}
            cx={focal.cx}
            cy={focal.cy}
            r={ring.rr}
            fill="none"
            stroke={palette.secondary}
            strokeWidth={ring.sw}
          />
        ))}
      </g>
      <g style={{ mixBlendMode: blend }}>
        {rings.map((ring) => (
          <circle
            key={`c1-${ring.key}`}
            cx={focal.cx}
            cy={focal.cy}
            r={ring.rr}
            fill="none"
            stroke={palette.primary}
            strokeWidth={ring.sw}
          />
        ))}
      </g>
    </g>
  )
}

const tpl_halftone = ({
  rng,
  palette,
  scale,
}: TemplateArgs): React.ReactElement => {
  const corners = [
    { cx: 0, cy: 400 },
    { cx: 400, cy: 400 },
    { cx: 0, cy: 0 },
    { cx: 400, cy: 0 },
  ]
  const corner = corners[Math.floor(rng() * 4)]!
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
  const blend = ia_blend(palette)
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g style={{ mixBlendMode: blend }}>
        <circle
          cx={corner.cx}
          cy={corner.cy}
          r={massR}
          fill={palette.primary}
        />
      </g>
      <g style={{ mixBlendMode: blend }}>
        {dots.map((dot) => (
          <circle
            key={dot.key}
            cx={dot.xx}
            cy={dot.yy}
            r={dot.rr}
            fill={palette.secondary}
          />
        ))}
      </g>
    </g>
  )
}

const tpl_blueprint = ({
  rng,
  palette,
  scale,
}: TemplateArgs): React.ReactElement => {
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
  const blend = ia_blend(palette)
  return (
    <g>
      <rect x="0" y="0" width="400" height="400" fill={palette.bg} />
      <g>
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
      </g>
      <g style={{ mixBlendMode: blend }}>
        <rect
          x={fpX}
          y={fpY}
          width={fpW}
          height={fpH}
          fill="none"
          stroke={palette.secondary}
          strokeWidth={scale === 'hero' ? 4 : 5}
        />
        <rect
          x={fpX + 10}
          y={fpY + 10}
          width={fpW - 20}
          height={fpH - 20}
          fill="none"
          stroke={palette.secondary}
          strokeWidth={1.2}
          strokeDasharray="4 5"
        />
        <circle
          cx={stageCx}
          cy={stageCy}
          r={stageR}
          fill={palette.primary}
          fillOpacity="0.85"
        />
        <circle
          cx={stageCx}
          cy={stageCy}
          r={stageR}
          fill="none"
          stroke={palette.secondary}
          strokeWidth={2}
        />
        <g transform={`rotate(${sweepAngle} ${stageCx} ${stageCy})`}>
          <line
            x1={stageCx}
            y1={stageCy}
            x2={stageCx + 220}
            y2={stageCy}
            stroke={palette.primary}
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
              stroke={palette.secondary}
              strokeWidth={1.2}
            />
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <line
                key={tick}
                x1={fpX + fpW * tick}
                y1={fpY + fpH + 12}
                x2={fpX + fpW * tick}
                y2={fpY + fpH + 20}
                stroke={palette.secondary}
                strokeWidth={1.2}
              />
            ))}
          </g>
        )}
      </g>
    </g>
  )
}

export const IA_TEMPLATES: IaTemplate[] = [
  { id: 'mesh', label: 'Mesh', render: tpl_mesh, kinds: ['artist', 'venue'] },
  {
    id: 'stripes',
    label: 'Stripes',
    render: tpl_stripes,
    kinds: ['artist', 'venue'],
  },
  {
    id: 'concentric',
    label: 'Concentric',
    render: tpl_concentric,
    kinds: ['artist', 'venue'],
  },
  {
    id: 'halftone',
    label: 'Halftone',
    render: tpl_halftone,
    kinds: ['artist'],
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    render: tpl_blueprint,
    kinds: ['venue'],
  },
]

const ia_templatesFor = (kind: Kind): IaTemplate[] =>
  IA_TEMPLATES.filter((tpl) => tpl.kinds.includes(kind))

// ── Identity resolver (pure — no React) ───────────────────────
export const identityFor = (
  name: string,
  kind: Kind,
  opts: { templateOverride?: string; paletteOverride?: string } = {},
) => {
  const ns = kind === 'venue' ? 'venue' : 'artist'
  const hash = ia_hashName(name, ns)
  const tplPool = ia_templatesFor(kind)
  const tplIdx = (hash >>> 0) % tplPool.length
  const palIdx = (hash >>> 8) % IA_PALETTES.length
  const rotate = (hash >>> 16) & 3
  const template = opts.templateOverride
    ? (IA_TEMPLATES.find((tpl) => tpl.id === opts.templateOverride) ??
      tplPool[tplIdx]!)
    : tplPool[tplIdx]!
  const palette = opts.paletteOverride
    ? (IA_PALETTES.find((pal) => pal.id === opts.paletteOverride) ??
      IA_PALETTES[palIdx]!)
    : IA_PALETTES[palIdx]!
  return { hash, template, palette, rotate, kind }
}

// ── Grain overlay ──────────────────────────────────────────────
const ia_grainBg = (strength: number): string => {
  const tt = Math.max(0, Math.min(1, strength))
  if (tt <= 0.001) return 'none'
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${tt} 0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
}

// ── <IdentityArt /> ────────────────────────────────────────────
export const IdentityArt = ({
  name,
  kind = 'artist',
  scale = 'hero',
  width,
  height,
  showInitials,
  grain = 0.1,
  templateOverride,
  paletteOverride,
  rotateOverride,
  className,
  style,
  'aria-label': ariaLabel,
}: IdentityArtProps) => {
  const resolved = identityFor(name, kind, {
    ...(templateOverride !== undefined && { templateOverride }),
    ...(paletteOverride !== undefined && { paletteOverride }),
  })
  const rot = (rotateOverride != null ? rotateOverride : resolved.rotate) % 4
  const rng = ia_rngFromHash(resolved.hash)
  const tpl = resolved.template.render({
    rng,
    hash: resolved.hash,
    palette: resolved.palette,
    scale,
    kind,
  })
  const initialsOn = showInitials != null ? showInitials : scale === 'hero'
  const initials = ia_getInitials(name)
  const grainUrl = ia_grainBg(grain)
  const dark = ia_isDark(resolved.palette.bg)
  const chipBg = dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)'
  const chipFg = dark ? '#FFFFFF' : '#15131A'
  const chipFs = scale === 'hero' ? 44 : 22
  const isLightPaper = !ia_isDark(resolved.palette.bg)

  return (
    <div
      className={className}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      style={{
        position: 'relative',
        width: width != null ? width : '100%',
        height: height != null ? height : '100%',
        overflow: 'hidden',
        background: resolved.palette.bg,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <g transform={`rotate(${rot * 90} 200 200)`}>{tpl}</g>
      </svg>

      {grain > 0.001 && (
        <div
          style={
            {
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage: grainUrl,
              mixBlendMode: isLightPaper ? 'multiply' : 'screen',
              opacity: isLightPaper ? 0.85 : 0.55,
            } as React.CSSProperties
          }
        />
      )}

      {initialsOn && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            padding: scale === 'hero' ? '6px 12px' : '3px 8px',
            borderRadius: scale === 'hero' ? 10 : 6,
            background: chipBg,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 900,
            fontSize: chipFs,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: chipFg,
            pointerEvents: 'none',
          }}
        >
          {initials}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)',
        }}
      />
    </div>
  )
}
