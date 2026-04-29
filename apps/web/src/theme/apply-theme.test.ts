// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme } from './apply-theme'
import { THEMES } from './themes'

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('style')
  })

  it('sets data-theme attribute to electric', () => {
    applyTheme('electric')
    expect(document.documentElement.getAttribute('data-theme')).toBe('electric')
  })

  it('sets all CSS variables as inline styles for electric theme', () => {
    applyTheme('electric')
    const expectedTokens = THEMES.electric

    for (const [key] of Object.entries(expectedTokens)) {
      const value = document.documentElement.style.getPropertyValue(`--${key}`)
      expect(value).toBe(expectedTokens[key])
    }
  })

  it('switches from electric to jade theme and updates both data-theme and CSS vars', () => {
    applyTheme('electric')
    expect(document.documentElement.getAttribute('data-theme')).toBe('electric')
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
      THEMES.electric['bg'],
    )

    applyTheme('jade')
    expect(document.documentElement.getAttribute('data-theme')).toBe('jade')
    for (const [key] of Object.entries(THEMES.jade)) {
      expect(document.documentElement.style.getPropertyValue(`--${key}`)).toBe(
        THEMES.jade[key],
      )
    }
  })

  it('sets data-theme attribute to light', () => {
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets all CSS variables for light theme', () => {
    applyTheme('light')
    const expectedTokens = THEMES.light

    for (const [key] of Object.entries(expectedTokens)) {
      const value = document.documentElement.style.getPropertyValue(`--${key}`)
      expect(value).toBe(expectedTokens[key])
    }
  })
})
