import { describe, expect, it } from 'vitest'

import { THEMES } from '@/theme/themes'

import { EMBED_LIGHT_PLATE, embedPlate } from './embed-plate'

describe('embedPlate', () => {
  it('hands a dark theme its resolved surface-1 hex', () => {
    expect(embedPlate('electric')).toBe(THEMES.electric['surface-1'])
    expect(embedPlate('jade')).toBe(THEMES.jade['surface-1'])
  })

  it('hands a light theme the fixed dark plate', () => {
    expect(embedPlate('light')).toBe(EMBED_LIGHT_PLATE)
  })

  it('falls back to the fixed dark plate for an unknown key', () => {
    expect(embedPlate('not-a-theme')).toBe(EMBED_LIGHT_PLATE)
  })

  it('never hands out a CSS variable — the iframe cannot read one', () => {
    for (const key of Object.keys(THEMES)) {
      expect(embedPlate(key)).not.toContain('var(')
      expect(embedPlate(key).startsWith('#')).toBe(true)
    }
  })
})
