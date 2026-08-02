import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImageResponse } from 'next/og'
import { IdentityArt, identityFor, ia_isDark } from '../IdentityArt'
import {
  IdentityArtPrint,
  printChipColors,
  printCoverViewBox,
  printGrainOpacity,
  printIdentityFor,
  printInkFor,
  type PrintKind,
} from '../IdentityArtPrint'
import { PRINT_GRAIN_PNG } from '../print-grain'
import { blendOver } from '../print-color'

const NAMES = [
  'King Gizzard & The Lizard Wizard',
  'Phoebe Bridgers',
  'black midi',
  'Khruangbin',
  'The Beths',
  'Turnstile',
  'Big Thief',
  'JPEGMAFIA',
  'Wednesday',
  'Sudan Archives',
  'Alvvays',
  'Mdou Moctar',
  'Yves Tumor',
  'Snail Mail',
  'Denzel Curry',
  'Hiatus Kaiyote',
  'Militarie Gun',
  'Ólafur Arnalds',
  'The Dip',
  'boygenius',
]

// The five template/kind combinations the kit has to survive. Halftone is
// artist-only and blueprint is venue-only, per IA_TEMPLATES.
const COMBOS: { template: string; kind: PrintKind }[] = [
  { template: 'mesh', kind: 'artist' },
  { template: 'stripes', kind: 'artist' },
  { template: 'concentric', kind: 'artist' },
  { template: 'halftone', kind: 'artist' },
  { template: 'blueprint', kind: 'venue' },
]

const markup = (node: React.ReactElement): string => renderToStaticMarkup(node)

const png = async (node: React.ReactElement, size = 400): Promise<Buffer> => {
  const response = new ImageResponse(node, { width: size, height: size })
  return Buffer.from(await response.arrayBuffer())
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])

// ── Determinism parity ─────────────────────────────────────────────

describe('determinism parity with <IdentityArt />', () => {
  it.each(NAMES)('%s derives the same identity for both renderers', (name) => {
    for (const kind of ['artist', 'venue'] as const) {
      const screen = identityFor(name, kind)
      const print = printIdentityFor(name, kind)
      expect(print.hash).toBe(screen.hash)
      expect(print.template.id).toBe(screen.template.id)
      expect(print.palette.id).toBe(screen.palette.id)
      expect(print.rotate).toBe(screen.rotate)
      expect(print.kind).toBe(screen.kind)
    }
  })

  it('honours the same overrides', () => {
    const screen = identityFor('Turnstile', 'artist', {
      templateOverride: 'blueprint',
      paletteOverride: 'p4',
    })
    const print = printIdentityFor('Turnstile', 'artist', {
      templateOverride: 'blueprint',
      paletteOverride: 'p4',
    })
    expect(print.template.id).toBe(screen.template.id)
    expect(print.palette.id).toBe(screen.palette.id)
  })

  it('never resolves halftone for a venue or blueprint for an artist', () => {
    for (const name of NAMES) {
      expect(printIdentityFor(name, 'venue').template.id).not.toBe('halftone')
      expect(printIdentityFor(name, 'artist').template.id).not.toBe('blueprint')
    }
  })
})

// ── Flattened blends ───────────────────────────────────────────────

describe('printInkFor', () => {
  it('screens on dark paper and multiplies on light', () => {
    for (const name of NAMES) {
      const { palette } = printIdentityFor(name, 'artist')
      const ink = printInkFor(palette)
      const expected = ia_isDark(palette.bg) ? 'screen' : 'multiply'
      expect(ink.mode).toBe(expected)
      expect(ink.primary).toBe(blendOver(palette.primary, palette.bg, expected))
      expect(ink.secondary).toBe(
        blendOver(palette.secondary, palette.bg, expected),
      )
    }
  })
})

describe('flattened template output', () => {
  it.each(COMBOS)(
    '$template/$kind emits no unsupported CSS and stable fills',
    ({ template, kind }) => {
      const html = markup(
        <IdentityArtPrint
          name="Khruangbin"
          kind={kind}
          width={400}
          height={400}
          templateOverride={template}
        />,
      )
      for (const banned of [
        'mix-blend-mode',
        'backdrop-filter',
        'mask-image',
        'feTurbulence',
        'preserveAspectRatio',
        'filter',
      ]) {
        expect(html).not.toContain(banned)
      }
      const fills = [...html.matchAll(/(?:fill|stroke)="([^"]+)"/g)]
        .map((match) => match[1])
        .filter((value): value is string => value !== undefined)
      expect(new Set(fills).size).toBeGreaterThan(1)
      expect([...new Set(fills)].sort()).toMatchSnapshot()
    },
  )

  it('the on-screen component still uses blend modes (the two differ)', () => {
    const screen = markup(
      <IdentityArt name="Khruangbin" width={400} height={400} />,
    )
    expect(screen).toContain('mix-blend-mode')
  })
})

// ── Grain, chip, sizing ────────────────────────────────────────────

describe('grain', () => {
  it('is omitted entirely at grain=0', () => {
    const html = markup(
      <IdentityArtPrint name="Big Thief" width={400} height={400} grain={0} />,
    )
    expect(html).not.toContain(PRINT_GRAIN_PNG)
  })

  it('is a tiled PNG data-URI by default', () => {
    const html = markup(
      <IdentityArtPrint name="Big Thief" width={400} height={400} />,
    )
    expect(html).toContain('data:image/png;base64,')
    expect(html).toContain('repeat')
  })

  it('scales with the paper', () => {
    const dark = printIdentityFor('Turnstile', 'artist').palette
    expect(printGrainOpacity(0, dark)).toBe(0)
    expect(printGrainOpacity(0.1, dark)).toBeGreaterThan(0)
    expect(printGrainOpacity(1, dark)).toBeLessThanOrEqual(1)
  })
})

describe('initials chip', () => {
  it('is skipped when showInitials is false', () => {
    const withChip = markup(
      <IdentityArtPrint name="Big Thief" width={400} height={400} />,
    )
    const without = markup(
      <IdentityArtPrint
        name="Big Thief"
        width={400}
        height={400}
        showInitials={false}
      />,
    )
    // ">BT<" rather than "BT" — the baked grain data-URI happens to contain
    // the bare letter pair.
    expect(withChip).toContain('>BT<')
    expect(without).not.toContain('>BT<')
  })

  it('renders an opaque chip colour — no backdrop blur', () => {
    for (const name of NAMES) {
      const { palette } = printIdentityFor(name, 'artist')
      const chip = printChipColors(palette)
      expect(chip.background).toMatch(/^#[0-9a-f]{6}$/)
      expect(chip.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

describe('printCoverViewBox', () => {
  it('is the full artboard for a square', () => {
    expect(printCoverViewBox(400, 400)).toBe('0 0 400 400')
    expect(printCoverViewBox(1080, 1080)).toBe('0 0 400 400')
  })

  it('crops the long axis, centred — the slice equivalent', () => {
    // 2:1 wide → full width, half height, centred vertically
    expect(printCoverViewBox(800, 400)).toBe('0 100 400 200')
    // 1:2 tall → full height, half width, centred horizontally
    expect(printCoverViewBox(400, 800)).toBe('100 0 200 400')
  })
})

// ── Render-through: the only proof satori dropped nothing ──────────

describe('ImageResponse render-through', () => {
  let blankBytes = 0

  it('establishes a flat-canvas baseline', async () => {
    const buffer = await png(
      <div
        style={{
          display: 'flex',
          width: 400,
          height: 400,
          backgroundColor: '#15131A',
        }}
      />,
    )
    blankBytes = buffer.length
    expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC)
    expect(blankBytes).toBeGreaterThan(0)
  }, 30000)

  const sizes = new Map<string, number>()

  it.each(COMBOS)(
    '$template/$kind renders a real PNG',
    async ({ template, kind }) => {
      const buffer = await png(
        <IdentityArtPrint
          name="Khruangbin"
          kind={kind}
          width={400}
          height={400}
          templateOverride={template}
        />,
      )
      expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC)
      // A dropped layer does not throw — it renders plainer. Anything close to
      // the flat-canvas baseline means satori silently ate the artwork.
      expect(buffer.length).toBeGreaterThan(Math.max(blankBytes * 3, 3000))
      sizes.set(`${template}/${kind}`, buffer.length)
    },
    30000,
  )

  it('every template produced a visually distinct image', () => {
    expect(sizes.size).toBe(COMBOS.length)
    expect(new Set(sizes.values()).size).toBe(COMBOS.length)
  })

  it('grain=0 and grain=0.1 are not the same image', async () => {
    const plain = await png(
      <IdentityArtPrint name="Khruangbin" width={400} height={400} grain={0} />,
    )
    const grainy = await png(
      <IdentityArtPrint
        name="Khruangbin"
        width={400}
        height={400}
        grain={0.1}
      />,
    )
    expect(plain.equals(grainy)).toBe(false)
    // Noise is incompressible: the grained PNG must be the larger of the two.
    expect(grainy.length).toBeGreaterThan(plain.length)
  }, 30000)

  it('renders a non-square poster crop', async () => {
    const response = new ImageResponse(
      <IdentityArtPrint name="boygenius" width={1080} height={1920} />,
      { width: 1080, height: 1920 },
    )
    const buffer = Buffer.from(await response.arrayBuffer())
    expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC)
    expect(buffer.length).toBeGreaterThan(10000)
  }, 30000)
})
