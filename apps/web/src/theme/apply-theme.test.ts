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

    // Spot-check representative tokens
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
      '#070A1A',
    )
    expect(document.documentElement.style.getPropertyValue('--fg')).toBe(
      '#E8F3FF',
    )
    expect(document.documentElement.style.getPropertyValue('--signal')).toBe(
      '#7AE6FF',
    )
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe(
      '#FF7BD4',
    )
    expect(
      document.documentElement.style.getPropertyValue('--border-focus'),
    ).toBe('#7AE6FF')

    // Verify all tokens are set
    for (const [key] of Object.entries(expectedTokens)) {
      const value = document.documentElement.style.getPropertyValue(`--${key}`)
      expect(value).toBe(expectedTokens[key])
    }
  })

  it('switches from electric to jade theme and updates both data-theme and CSS vars', () => {
    applyTheme('electric')
    expect(document.documentElement.getAttribute('data-theme')).toBe('electric')
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
      '#070A1A',
    )

    applyTheme('jade')
    expect(document.documentElement.getAttribute('data-theme')).toBe('jade')
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
      '#06201F',
    )
    expect(document.documentElement.style.getPropertyValue('--fg')).toBe(
      '#E6FFF6',
    )
    expect(document.documentElement.style.getPropertyValue('--signal')).toBe(
      '#1FFFC2',
    )
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe(
      '#9B5CFF',
    )
    expect(
      document.documentElement.style.getPropertyValue('--border-focus'),
    ).toBe('#1FFFC2')
  })

  it('sets data-theme attribute to light', () => {
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('sets all CSS variables for light theme', () => {
    applyTheme('light')
    const expectedTokens = THEMES.light

    expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
      '#FAFCFF',
    )
    expect(document.documentElement.style.getPropertyValue('--fg')).toBe(
      '#070A1A',
    )
    expect(document.documentElement.style.getPropertyValue('--signal')).toBe(
      '#0080A0',
    )
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe(
      '#E0297A',
    )
    expect(
      document.documentElement.style.getPropertyValue('--border-focus'),
    ).toBe('#0080A0')

    // Verify all tokens are set
    for (const [key] of Object.entries(expectedTokens)) {
      const value = document.documentElement.style.getPropertyValue(`--${key}`)
      expect(value).toBe(expectedTokens[key])
    }
  })
})
