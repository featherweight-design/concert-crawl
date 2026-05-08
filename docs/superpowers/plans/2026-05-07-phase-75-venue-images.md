# Phase 7.5 — Identity Imagery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monogram-on-gradient placeholder on every image surface with `<IdentityArt />` — a deterministic generative art engine (FNV-1a hash → template + palette + rotation → SVG). Same entity name always produces the same image. No content pipeline, no DB changes.

**Architecture:** Port `design/design_handoff_phase7_5_identity_imagery/identity-art.jsx` to a pure TypeScript/React server component at `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`. Wire it as the null-`src` fallback inside `EventImage` (artist surfaces) and directly into the venue detail hero (venue surface). Phase 8 swaps in real photos at the same call sites — zero layout churn.

**Tech Stack:** React (no hooks, pure render), SVG, Vitest (pure-function unit tests), TypeScript strict mode

**Deferred to Phase 8:** `image_url` column on `venues`, OG image extraction from crawler, admin form image field, Cloudflare R2 storage.

---

## Scope

### What this phase ships

- `<IdentityArt />` engine — 5 templates, 8 palettes, deterministic per entity
- `EventImage` updated: `<IdentityArt kind="artist" />` replaces the gradient+initial fallback
- Venue detail hero: `<IdentityArt kind="venue" />` replaces the raw gradient+initials block
- All `EventImage` call sites updated: `fallbackInitial` removed, `identityScale` added

### What it does NOT ship

- DB schema changes
- Crawler changes
- Admin UI changes
- Real photo support (Phase 8)

---

## Design reference

`design/design_handoff_phase7_5_identity_imagery/README.md` — public API, engine spec, palette table, template descriptions, accessibility notes, Phase 8 fallback contract.

`design/design_handoff_phase7_5_identity_imagery/identity-art.jsx` — reference implementation to port. Drop the `Object.assign(window, …)` at the bottom; use named exports instead.

---

## File Map

| Action | Path                                                                 | Responsibility                                                                                                              |
| ------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Create | `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`      | Engine: hash → SVG art. Exports `IdentityArt`, `identityFor`, `IA_TEMPLATES`, `IA_PALETTES`, and internal helpers for tests |
| Create | `apps/web/src/components/consumer/identity-art/IdentityArt.test.ts`  | Unit tests for all pure functions                                                                                           |
| Modify | `apps/web/src/components/consumer/event-image/EventImage.tsx`        | Replace gradient fallback with `<IdentityArt>`; add `identityScale` prop; drop `fallbackInitial`                            |
| Delete | `apps/web/src/components/consumer/event-image/artist-gradient.ts`    | No longer needed after EventImage update                                                                                    |
| Modify | `apps/web/src/app/(protected)/events/[id]/page.tsx`                  | Add `identityScale="hero"`, remove `fallbackInitial`                                                                        |
| Modify | `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx` | Add `identityScale="hero"`, remove `fallbackInitial`                                                                        |
| Modify | `apps/web/src/components/consumer/event-card/EventCard.tsx`          | Add `identityScale="tile"`, remove `fallbackInitial`                                                                        |
| Modify | `apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx` | Add `identityScale="micro"`, remove `fallbackInitial`                                                                       |
| Modify | `apps/web/src/app/(protected)/venues/[slug]/page.tsx`                | Replace raw gradient+initials hero with `<IdentityArt kind="venue" scale="hero" />`                                         |

---

## Task 1: Port `IdentityArt` engine — tests first

**Files:**

- Create: `apps/web/src/components/consumer/identity-art/IdentityArt.test.ts`
- Create: `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`

- [ ] **Step 1: Write the failing unit tests**

Create `apps/web/src/components/consumer/identity-art/IdentityArt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  ia_hashName,
  ia_getInitials,
  ia_isDark,
  identityFor,
  IA_TEMPLATES,
  IA_PALETTES,
} from './IdentityArt'

describe('ia_getInitials', () => {
  it('returns first 2 chars for a single non-stop word', () => {
    expect(ia_getInitials('Geese')).toBe('GE')
  })
  it('returns first letter of each of the first two non-stop words', () => {
    expect(ia_getInitials('Mission Ballroom')).toBe('MB')
  })
  it('skips leading stop word "The"', () => {
    expect(ia_getInitials('The Ogden')).toBe('OG')
  })
  it('handles multi-word with stop words mixed in', () => {
    expect(ia_getInitials('Red Rocks Amphitheatre')).toBe('RR')
  })
  it('returns "??" for empty string', () => {
    expect(ia_getInitials('')).toBe('??')
  })
})

describe('ia_isDark', () => {
  it('returns true for a dark background', () => {
    expect(ia_isDark('#15131A')).toBe(true)
  })
  it('returns false for a light background', () => {
    expect(ia_isDark('#F1E6D5')).toBe(false)
  })
  it('returns false for invalid input', () => {
    expect(ia_isDark('')).toBe(false)
    expect(ia_isDark('notahex')).toBe(false)
  })
})

describe('ia_hashName', () => {
  it('returns a non-zero number for non-empty input', () => {
    expect(ia_hashName('Mission Ballroom', 'venue')).toBeGreaterThan(0)
  })
  it('same name + namespace always produces the same hash', () => {
    expect(ia_hashName('Pavement', 'artist')).toBe(
      ia_hashName('Pavement', 'artist'),
    )
  })
  it('same name in different namespaces produces different hashes', () => {
    expect(ia_hashName('Pavement', 'artist')).not.toBe(
      ia_hashName('Pavement', 'venue'),
    )
  })
})

describe('identityFor', () => {
  it('is deterministic — same inputs always produce the same result', () => {
    const first = identityFor('Mission Ballroom', 'venue')
    const second = identityFor('Mission Ballroom', 'venue')
    expect(first.hash).toBe(second.hash)
    expect(first.template.id).toBe(second.template.id)
    expect(first.palette.id).toBe(second.palette.id)
  })

  it('returns a template compatible with the requested kind', () => {
    const venue = identityFor('Test Venue', 'venue')
    expect(venue.template.kinds).toContain('venue')

    const artist = identityFor('Test Artist', 'artist')
    expect(artist.template.kinds).toContain('artist')
  })

  it('never assigns blueprint template to an artist', () => {
    for (let idx = 0; idx < 50; idx++) {
      expect(identityFor(`Artist ${idx}`, 'artist').template.id).not.toBe(
        'blueprint',
      )
    }
  })

  it('never assigns halftone template to a venue', () => {
    for (let idx = 0; idx < 50; idx++) {
      expect(identityFor(`Venue ${idx}`, 'venue').template.id).not.toBe(
        'halftone',
      )
    }
  })

  it('returns a palette from IA_PALETTES', () => {
    const result = identityFor('Red Rocks', 'venue')
    expect(IA_PALETTES.some((pal) => pal.id === result.palette.id)).toBe(true)
  })

  it('templateOverride selects the named template', () => {
    const result = identityFor('Any Name', 'artist', {
      templateOverride: 'stripes',
    })
    expect(result.template.id).toBe('stripes')
  })

  it('paletteOverride selects the named palette', () => {
    const result = identityFor('Any Name', 'artist', { paletteOverride: 'p4' })
    expect(result.palette.id).toBe('p4')
  })
})

describe('IA_TEMPLATES', () => {
  it('contains exactly 5 templates', () => {
    expect(IA_TEMPLATES).toHaveLength(5)
  })
  it('each template has a render function', () => {
    IA_TEMPLATES.forEach((tpl) => expect(typeof tpl.render).toBe('function'))
  })
})

describe('IA_PALETTES', () => {
  it('contains exactly 8 palettes', () => {
    expect(IA_PALETTES).toHaveLength(8)
  })
  it('each palette has valid hex values for bg, primary, and secondary', () => {
    IA_PALETTES.forEach((pal) => {
      expect(pal.bg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(pal.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(pal.secondary).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests fail with `Cannot find module './IdentityArt'`

- [ ] **Step 3: Create the engine file**

Create `apps/web/src/components/consumer/identity-art/IdentityArt.tsx`.

Port faithfully from `design/design_handoff_phase7_5_identity_imagery/identity-art.jsx`. Key changes from the reference:

- No `'use client'` — pure server/shared component (no hooks, no browser APIs beyond `encodeURIComponent`)
- Drop `Object.assign(window, …)` — named exports instead
- Arrow functions per project convention
- TypeScript types throughout
- Export internal helpers (`ia_hashName`, `ia_getInitials`, `ia_isDark`) for testability
- Drop `ia_uid` — defined in the reference but never called; gradient IDs are already coordinate-based

```tsx
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
  const offsetX = 6,
    offsetY = 4
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
  const isLight = /^#[EF]/i.test(palette.bg)
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
            {[0, 0.25, 0.5, 0.75, 1].map((tick, idx) => (
              <line
                key={idx}
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
  const rotate: [number, number] = [(hash >>> 16) & 3, (hash >>> 18) & 1]
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
}: IdentityArtProps) => {
  const resolved = identityFor(name, kind, {
    templateOverride,
    paletteOverride,
  })
  const rot = (rotateOverride != null ? rotateOverride : resolved.rotate[0]) % 4
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
  const isLightPaper = /^#[EF]/i.test(resolved.palette.bg)

  return (
    <div
      className={className}
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/consumer/identity-art/
git commit -m "feat: add IdentityArt generative identity engine"
```

---

## Task 2: Update `EventImage` — swap gradient fallback for `IdentityArt`

**Files:**

- Modify: `apps/web/src/components/consumer/event-image/EventImage.tsx`
- Delete: `apps/web/src/components/consumer/event-image/artist-gradient.ts`

No automated tests for this component — it's a client component with state. Covered by the manual smoke test in Task 5.

- [ ] **Step 1: Rewrite `EventImage.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { IdentityArt } from '../identity-art/IdentityArt'

type IdentityScale = 'hero' | 'tile' | 'micro'

interface EventImageProps {
  src: string | null
  alt: string
  artist?: string
  identityScale?: IdentityScale
  className?: string
  fill?: boolean
  sizes?: string
}

export function EventImage({
  src,
  alt,
  artist,
  identityScale = 'tile',
  className,
  fill = false,
  sizes,
}: EventImageProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <IdentityArt
        name={artist ?? alt}
        kind="artist"
        scale={identityScale}
        className={className}
      />
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      )}
      {/* image-tint overlay — blends hotlinked images into active theme */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--image-tint)' }}
        aria-hidden
      />
    </div>
  )
}
```

- [ ] **Step 2: Delete `artist-gradient.ts`**

```bash
git rm apps/web/src/components/consumer/event-image/artist-gradient.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/consumer/event-image/EventImage.tsx
git commit -m "feat: replace gradient fallback in EventImage with IdentityArt"
```

---

## Task 3: Update `EventImage` call sites — remove `fallbackInitial`, add `identityScale`

**Files:**

- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx`
- Modify: `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`
- Modify: `apps/web/src/components/consumer/event-card/EventCard.tsx`
- Modify: `apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx`

Scale assignments — match display size to IdentityArt detail level:

- Event detail hero (320px) → `identityScale="hero"`
- HeroEventCard (180px) → `identityScale="hero"`
- EventCard (48×48) → `identityScale="tile"`
- SmallEventRow (40×40) → `identityScale="micro"`

- [ ] **Step 1: Update event detail page**

In `apps/web/src/app/(protected)/events/[id]/page.tsx`, find the `<EventImage>` call in the hero and update it:

```tsx
// Before:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  fallbackInitial={artistInitial(event.artist)}
  className="h-full w-full"
  fill
  sizes="(max-width: 1024px) 100vw, 720px"
/>

// After:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  identityScale="hero"
  className="h-full w-full"
  fill
  sizes="(max-width: 1024px) 100vw, 720px"
/>
```

- [ ] **Step 2: Update HeroEventCard**

In `apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx`:

```tsx
// Before:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  fallbackInitial={artistInitial(event.artist)}
  className="h-full w-full"
  fill
  sizes="(max-width: 1024px) 100vw, 720px"
/>

// After:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  identityScale="hero"
  className="h-full w-full"
  fill
  sizes="(max-width: 1024px) 100vw, 720px"
/>
```

- [ ] **Step 3: Update EventCard**

In `apps/web/src/components/consumer/event-card/EventCard.tsx`:

```tsx
// Before:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  fallbackInitial={artistInitial(event.artist)}
  className="h-full w-full"
/>

// After:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  identityScale="tile"
  className="h-full w-full"
/>
```

- [ ] **Step 4: Update SmallEventRow**

In `apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx`:

```tsx
// Before:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  fallbackInitial={artistInitial(event.artist)}
  className="h-full w-full"
/>

// After:
<EventImage
  src={event.imageUrl}
  alt={event.artist}
  artist={event.artist}
  identityScale="micro"
  className="h-full w-full"
/>
```

- [ ] **Step 5: Run typecheck to verify all call sites are clean**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors; no remaining `fallbackInitial` references

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(protected)/events/[id]/page.tsx \
        apps/web/src/components/consumer/hero-event-card/HeroEventCard.tsx \
        apps/web/src/components/consumer/event-card/EventCard.tsx \
        apps/web/src/components/consumer/small-event-row/SmallEventRow.tsx
git commit -m "feat: update EventImage call sites — identityScale, drop fallbackInitial"
```

---

## Task 4: Venue detail hero — replace gradient with `IdentityArt`

**Files:**

- Modify: `apps/web/src/app/(protected)/venues/[slug]/page.tsx`

The venue hero (lines 64–85) renders a raw gradient with large initials. The `initials`, `words`, `hues`, `hueIdx`, and `hue` variables above the return are only used by this block — remove them all.

- [ ] **Step 1: Add the import**

In `apps/web/src/app/(protected)/venues/[slug]/page.tsx`, add after the existing imports:

```tsx
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt'
```

- [ ] **Step 2: Delete the now-unused variables**

Remove these lines entirely (approximately lines 41–52):

```tsx
// Delete:
const words = venue.name.split(' ')
const initials =
  words.length >= 2
    ? (words[0]?.charAt(0) ?? '') + (words[1]?.charAt(0) ?? '')
    : venue.name.charAt(0)

const hues = [30, 160, 260, 80, 320, 200]
const hueIdx =
  venue.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
  hues.length
const hue = hues[hueIdx] ?? 200
```

- [ ] **Step 3: Replace the gradient block**

Replace the gradient+initials `<div>` (the `{/* Gradient placeholder */}` comment through its closing `</div>`) with `<IdentityArt>`. The image-tint, bottom-scrim, back-button, and breadcrumb divs that follow are unchanged:

```tsx
{/* Hero — 320px */}
<div className="relative w-full shrink-0" style={{ height: 320 }}>
  <IdentityArt
    kind="venue"
    name={venue.name}
    scale="hero"
    className="absolute inset-0"
  />
  {/* Image tint */}
  <div
    className="pointer-events-none absolute inset-0"
    style={{ background: 'var(--image-tint)' }}
    aria-hidden
  />
  {/* Bottom scrim */}
  <div
    className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
    style={{ background: 'linear-gradient(transparent, var(--bg))' }}
    aria-hidden
  />
  {/* Mobile: floating back button — unchanged */}
  ...
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm --filter @concert-crawl/web typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(protected)/venues/[slug]/page.tsx
git commit -m "feat: replace venue detail gradient placeholder with IdentityArt"
```

---

## Task 5: Final verification + PR

- [ ] **Step 1: Run full test suite**

```bash
pnpm --filter @concert-crawl/web test
```

Expected: all tests pass

- [ ] **Step 2: Run typecheck across all packages**

```bash
pnpm typecheck
```

Expected: no errors

- [ ] **Step 3: Manual smoke test**

Start the dev server (`pnpm dev`) and verify each surface:

| Surface                   | URL                                    | Check                                                             |
| ------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| Browse list tiles (48px)  | `/events`                              | Each event card shows generative art, not the old gradient+letter |
| SmallEventRow (40px)      | `/venues/<slug>` (upcoming shows list) | Simplified art at small scale                                     |
| HeroEventCard (180px)     | `/events` (top featured card)          | Detailed art, initials chip visible                               |
| Event detail hero (320px) | `/events/<id>`                         | Full art + initials chip bottom-left                              |
| Venue detail hero (320px) | `/venues/<slug>`                       | Venue art (blueprint template possible); initials chip            |

Verify:

- Two different artists show **different** art
- Reloading shows the **same** art (determinism)
- Initials chip is legible over busy art on hero surfaces
- Image-tint overlay and bottom scrim still render on detail heroes
- No TypeScript or console errors

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --title "feat: Phase 7.5 — generative identity art for artists and venues" \
  --base main \
  --head feat/phase-75-venue-images
```

PR description:

- **What:** `<IdentityArt />` engine — FNV-1a hash → 5 templates × 8 palettes × 4 rotations → deterministic SVG per entity. Replaces the monogram-on-gradient placeholder on all image surfaces.
- **Why:** Visual identity before beta launch; real photos slot in at the same call sites in Phase 8 with zero layout churn.
- **Surfaces:** event detail hero, venue detail hero, HeroEventCard (180px), EventCard (48px), SmallEventRow (40px).
- **Testing:** 20 unit tests on pure engine functions; manual smoke across all 5 surfaces.
- **No DB changes:** `image_url` on venues deferred to Phase 8.

---

## Rollback

No DB or API changes. Rollback is a plain revert of the PR — the gradient+initials code is in git history.
