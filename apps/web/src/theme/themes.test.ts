import { describe, it, expect } from 'vitest'
import { THEMES, type ThemeName } from './themes'

const REQUIRED_TOKENS = [
  'bg',
  'bg-elevated',
  'surface-1',
  'surface-2',
  'surface-3',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-on-accent',
  'border',
  'border-strong',
  'border-focus',
  'signal',
  'signal-muted',
  'accent',
  'accent-muted',
  'success',
  'warning',
  'danger',
  'focus',
  'overlay-hover',
  'overlay-press',
  'scrim',
  'image-tint',
] as const

const THEME_NAMES: ThemeName[] = ['electric', 'jade', 'light']

describe('THEMES', () => {
  it('exports exactly three themes', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES].sort())
  })

  for (const name of THEME_NAMES) {
    describe(`theme: ${name}`, () => {
      it('contains every required token', () => {
        for (const token of REQUIRED_TOKENS) {
          expect(THEMES[name], `missing token --${token}`).toHaveProperty(token)
        }
      })

      it('has exactly the required number of tokens', () => {
        expect(Object.keys(THEMES[name]).length).toBe(REQUIRED_TOKENS.length)
      })

      it('has no undefined or empty token values', () => {
        for (const [token, value] of Object.entries(THEMES[name])) {
          expect(typeof value, `--${token} is not a string`).toBe('string')
          expect(value.length, `--${token} is empty`).toBeGreaterThan(0)
        }
      })
    })
  }
})
