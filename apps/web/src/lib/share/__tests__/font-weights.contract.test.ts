import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHARE_FONTS } from '../fonts'

/**
 * Satori only has the weights `loadShareFonts` hands it. A card that asks for
 * one outside that set still renders — the browser preview honours the request
 * from the system font stack while the PNG falls back to a neighbouring weight,
 * so the two diverge in the one place nobody is looking. The print kit exists
 * to make that impossible, and only a sweep of every card can enforce it.
 */

const CARD_DIRS = [
  'src/components/consumer/share',
  'src/components/consumer/passport',
]

const FONT_WEIGHT = /fontWeight:\s*(\d+)/g

const cardFiles = (dir: string): string[] => {
  const root = path.resolve(__dirname, '../../../..', dir)
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.tsx') && !entry.includes('__tests__'))
    .map((entry) => path.join(root, entry))
}

describe('share card font weights', () => {
  const loaded = new Set<number>(SHARE_FONTS.map((font) => font.weight))

  it.each(CARD_DIRS.flatMap(cardFiles))(
    'only requests a weight the PNG can actually render: %s',
    (file) => {
      const requested = [...readFileSync(file, 'utf8').matchAll(FONT_WEIGHT)]
        .map((match) => Number(match[1]))
        .filter((weight) => !loaded.has(weight))

      expect(requested).toEqual([])
    },
  )
})
