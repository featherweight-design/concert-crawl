import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SHARE_FONTS,
  loadShareFonts,
  type ShareFontLoader,
} from '@/lib/share/fonts'

const PUBLIC_DIR = path.resolve(__dirname, '../../../../public')

/** Reads the real bundled TTFs off disk — the closest stand-in for the edge fetch. */
const diskLoader: ShareFontLoader = async (assetPath) => {
  const buffer = await readFile(path.join(PUBLIC_DIR, assetPath))
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  )
}

describe('SHARE_FONTS', () => {
  it('declares both families the poster sets type in', () => {
    const families = new Set(SHARE_FONTS.map((font) => font.name))
    expect(families).toEqual(new Set(['Inter', 'JetBrains Mono']))
  })

  it('declares every weight the poster uses, with no duplicates', () => {
    const keys = SHARE_FONTS.map((font) => `${font.name}:${font.weight}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('Inter:400')
    expect(keys).toContain('Inter:700')
    expect(keys).toContain('Inter:900')
    expect(keys).toContain('JetBrains Mono:700')
  })

  it('points every entry at a path under the share font directory', () => {
    for (const font of SHARE_FONTS) {
      expect(font.assetPath).toMatch(/^\/fonts\/share\/[\w-]+\.ttf$/)
    }
  })
})

describe('loadShareFonts', () => {
  it('returns real font data for every declared face', async () => {
    const fonts = await loadShareFonts(diskLoader)
    expect(fonts).toHaveLength(SHARE_FONTS.length)
    for (const font of fonts) {
      // A TTF is never this small; a 404 HTML body would be.
      expect(font.data.byteLength).toBeGreaterThan(10_000)
      expect(font.style).toBe('normal')
    }
  })

  it('throws rather than silently falling back when a face is missing', async () => {
    const failing: ShareFontLoader = async (assetPath) => {
      if (assetPath.includes('jbmono')) {
        throw new Error('404')
      }
      return diskLoader(assetPath)
    }
    await expect(loadShareFonts(failing)).rejects.toThrow(/jbmono/)
  })

  it('throws when a face loads but is empty', async () => {
    const empty: ShareFontLoader = async () => new ArrayBuffer(0)
    await expect(loadShareFonts(empty)).rejects.toThrow(/empty/i)
  })
})
