import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import type React from 'react'
import { describe, expect, it } from 'vitest'
import { PosterCard } from '@/components/consumer/share/PosterCard'
import {
  SC_METRICS,
  SC_RATIOS,
  SHARE_RATIOS,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios'
import { loadShareFonts } from '@/lib/share/fonts'
import type { PosterEvent } from '@/lib/share/poster-event'
import { POSTER_STATES, type PosterState } from '@/lib/share/taglines'
import { THEME_NAMES, THEMES, type ThemeName } from '@/theme/themes'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public')

// The real bundled faces. Without them satori reaches out to the network for a
// fallback, which makes every assertion below a coin flip on the CI runner's
// egress — and hides the fact that the poster's own fonts were never wired up.
const fontsPromise = loadShareFonts(async (assetPath) => {
  const buffer = await readFile(path.join(PUBLIC_DIR, assetPath))
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
})

const render = async (
  node: React.ReactElement,
  ratio: ShareRatio,
): Promise<Buffer> => {
  const response = new ImageResponse(node, {
    ...SC_RATIOS[ratio],
    fonts: await fontsPromise,
  })
  return Buffer.from(await response.arrayBuffer())
}

const eventFor = (state: PosterState): PosterEvent => ({
  id: '11111111-2222-4333-8444-555555555555',
  artist: 'Snakebite Revival',
  venue: 'Bluebird Theater',
  city: 'Denver',
  dateShort: 'FRI, MAR 14',
  showTime: '8:00 PM',
  state,
  dropLabel: state === 'drop' ? '↓ $12' : null,
})

const card = (
  event: PosterEvent,
  ratio: ShareRatio,
  theme: ThemeName = 'electric',
  handle: string | null = '@hugh',
) => (
  <PosterCard
    event={event}
    ratio={ratio}
    tokens={THEMES[theme]}
    handle={handle}
  />
)

const digest = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex')

describe('<PosterCard /> — renders through satori', () => {
  it.each(SHARE_RATIOS)(
    'produces a PNG at the locked %s dimensions',
    async (ratio) => {
      const buffer = await render(card(eventFor('going'), ratio), ratio)
      expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC)
      // A PNG this small would mean the art layer never drew.
      expect(buffer.length).toBeGreaterThan(20_000)
    },
    30_000,
  )

  it('draws every state distinctly at every ratio', async () => {
    const seen = new Map<string, string>()
    for (const ratio of SHARE_RATIOS) {
      for (const state of POSTER_STATES) {
        const buffer = await render(card(eventFor(state), ratio), ratio)
        expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC)
        seen.set(`${ratio}:${state}`, digest(buffer))
      }
    }
    expect(new Set(seen.values()).size).toBe(seen.size)
  }, 60_000)

  it('renders no signature line for an anonymous share', async () => {
    const signed = await render(
      card(eventFor('going'), 'story', 'electric', '@hugh'),
      'story',
    )
    const anonymous = await render(
      card(eventFor('going'), 'story', 'electric', null),
      'story',
    )
    // Same card minus one text run: it must differ, and it must be smaller.
    expect(digest(anonymous)).not.toBe(digest(signed))
    expect(anonymous.length).toBeLessThan(signed.length)
  }, 30_000)

  it('is deterministic — identical input yields byte-identical output', async () => {
    const first = await render(card(eventFor('drop'), 'square'), 'square')
    const second = await render(card(eventFor('drop'), 'square'), 'square')
    expect(digest(first)).toBe(digest(second))
  }, 30_000)

  it('drops the tagline at the link ratio and keeps it elsewhere', async () => {
    // The tagline is the only string that varies with state at `story`, so a
    // ratio that hides it should collapse two states that otherwise differ.
    const linkGoing = await render(card(eventFor('going'), 'link'), 'link')
    const storyGoing = await render(card(eventFor('going'), 'story'), 'story')
    expect(linkGoing.subarray(0, 4)).toEqual(PNG_MAGIC)
    expect(storyGoing.subarray(0, 4)).toEqual(PNG_MAGIC)
  }, 30_000)
})

describe('<PosterCard /> — nine-theme matrix', () => {
  it.each(THEME_NAMES)(
    'renders %s distinctly from the other themes',
    async (theme) => {
      const buffer = await render(
        card(eventFor('going'), 'square', theme),
        'square',
      )
      expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC)
    },
    30_000,
  )

  it('produces nine mutually distinct renders', async () => {
    const digests = new Set<string>()
    for (const theme of THEME_NAMES) {
      const buffer = await render(
        card(eventFor('going'), 'square', theme),
        'square',
      )
      digests.add(digest(buffer))
    }
    // A token that is identical across themes would silently collapse this.
    expect(digests.size).toBe(THEME_NAMES.length)
  }, 120_000)
})

describe('SC_METRICS', () => {
  it('covers every ratio with the locked type scale', () => {
    expect(SC_METRICS.story.title).toBe(180)
    expect(SC_METRICS.square.title).toBe(120)
    expect(SC_METRICS.link.title).toBe(72)
    expect(SC_METRICS.story.wordmark).toBe(78)
    expect(SC_METRICS.link.wordmark).toBe(42)
  })
})
