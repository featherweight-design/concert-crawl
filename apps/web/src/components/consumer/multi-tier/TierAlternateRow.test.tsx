// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { TierAlternateRow } from './TierAlternateRow'

afterEach(() => {
  cleanup()
})

describe('TierAlternateRow', () => {
  it('renders boxoffice kind with gold dot', () => {
    const { container } = render(
      <TierAlternateRow
        tier="GA"
        vendor="Bluebird"
        floor={25}
        kind="boxoffice"
      />,
    )
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null
    expect(dot).not.toBeNull()
    expect(dot!.style.background).toContain('oklch(0.66 0.14 78)')
  })

  it('renders community kind with azure dot', () => {
    const { container } = render(
      <TierAlternateRow tier="GA" vendor="AXS" floor={30} kind="community" />,
    )
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null
    expect(dot).not.toBeNull()
    expect(dot!.style.background).toContain('oklch(0.62 0.12 240)')
  })

  it('renders resale kind with coral dot (oklch(0.65 0.20 25))', () => {
    const { container } = render(
      <TierAlternateRow
        tier="VIP"
        vendor="StubHub"
        floor={150}
        kind="resale"
      />,
    )
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null
    expect(dot).not.toBeNull()
    // JSDOM normalizes 0.20 → 0.2
    expect(dot!.style.background).toContain('oklch(0.65 0.2 25)')
    expect(screen.getByText('StubHub')).toBeDefined()
    expect(screen.getByText('$150')).toBeDefined()
  })

  it('renders null kind with muted dot', () => {
    const { container } = render(
      <TierAlternateRow tier="GA" vendor="Unknown" floor={20} kind={null} />,
    )
    const dot = container.querySelector(
      'div[style*="border-radius: 2.5px"]',
    ) as HTMLElement | null
    expect(dot).not.toBeNull()
    expect(dot!.style.background).toBe('var(--fg-muted)')
  })
})
