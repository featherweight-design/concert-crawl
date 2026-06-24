// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AltSourceRow } from './AltSourceRow'

afterEach(() => {
  cleanup()
})

// jsdom normalizes CSS numeric values (e.g. `0.20` → `0.2`); these reflect post-normalization.
const CORAL = 'oklch(0.65 0.2 25)'
const GOLD = 'oklch(0.66 0.14 78)'
const AZURE = 'oklch(0.62 0.12 240)'

describe('AltSourceRow', () => {
  it('renders resale variant with coral dot, source label, "resale" pill, and price', () => {
    const { container } = render(
      <AltSourceRow source="Ticketmaster" kind="resale" price={35} />,
    )

    // Source label
    expect(screen.getByText('Ticketmaster')).toBeDefined()
    // Kind pill (lowercase in copy; CSS uppercases it)
    expect(screen.getByText('resale')).toBeDefined()
    // Price
    expect(screen.getByText('$35')).toBeDefined()

    // Dot color — first child span with background style
    const dot = container.querySelector('span[style*="border-radius"]')
    expect(dot).not.toBeNull()
    expect((dot as HTMLElement).style.background).toContain(CORAL)
  })

  it('renders boxoffice variant with gold dot and "box office" pill', () => {
    const { container } = render(
      <AltSourceRow source="AXS" kind="boxoffice" price={42} />,
    )

    expect(screen.getByText('AXS')).toBeDefined()
    expect(screen.getByText('box office')).toBeDefined()
    expect(screen.getByText('$42')).toBeDefined()

    const dot = container.querySelector('span[style*="border-radius"]')
    expect((dot as HTMLElement).style.background).toContain(GOLD)
  })

  it('renders community variant with azure dot and "community" pill', () => {
    const { container } = render(
      <AltSourceRow source="Fan submission" kind="community" price={30} />,
    )

    expect(screen.getByText('Fan submission')).toBeDefined()
    expect(screen.getByText('community')).toBeDefined()
    expect(screen.getByText('$30')).toBeDefined()

    const dot = container.querySelector('span[style*="border-radius"]')
    expect((dot as HTMLElement).style.background).toContain(AZURE)
  })
})
