import { describe, it, expect } from 'vitest'
import { THEMES, THEME_NAMES } from '@/theme/themes'
import {
  DEFAULT_SHARE_THEME,
  SHARE_CARD_TOKENS,
  isThemeName,
  resolveThemeTokens,
} from '../theme-tokens'

describe('resolveThemeTokens', () => {
  it('resolves all nine theme names to themselves', () => {
    expect(THEME_NAMES).toHaveLength(9)
    for (const name of THEME_NAMES) {
      const resolved = resolveThemeTokens(name)
      expect(resolved.theme).toBe(name)
      expect(resolved.tokens).toBe(THEMES[name])
    }
  })

  it.each([undefined, '', 'nope', '__proto__', 'constructor', 'ELECTRIC'])(
    'falls back to electric for %p',
    (raw) => {
      const resolved = resolveThemeTokens(raw)
      expect(resolved.theme).toBe(DEFAULT_SHARE_THEME)
      expect(resolved.tokens).toBe(THEMES.electric)
    },
  )

  it('never returns a prototype-derived record', () => {
    const resolved = resolveThemeTokens('__proto__')
    expect(typeof resolved.tokens).toBe('object')
    expect(resolved.tokens['bg']).toBe(THEMES.electric['bg'])
  })
})

describe('isThemeName', () => {
  it('accepts only the nine names', () => {
    for (const name of THEME_NAMES) expect(isThemeName(name)).toBe(true)
    for (const bad of ['', 'nope', '__proto__', 'toString', 'Electric'])
      expect(isThemeName(bad)).toBe(false)
  })
})

describe('nine-theme token coverage', () => {
  it.each(THEME_NAMES)('%s defines every share-card token', (name) => {
    const tokens = THEMES[name]
    for (const token of SHARE_CARD_TOKENS) {
      expect(
        typeof tokens[token] === 'string' && tokens[token] !== '',
        `theme "${name}" is missing token "${token}"`,
      ).toBe(true)
    }
  })
})
