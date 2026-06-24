// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MTListChip } from './MTListChip'

afterEach(() => {
  cleanup()
})

// jsdom normalizes standalone oklch tokens read via element.style.color
// (drops trailing zeros — 0.20 → 0.2) but leaves embedded color-mix(...) strings
// intact. Different constants for the two cases.
const RESALE = 'oklch(0.65 0.20 25)'
const RESALE_NORM = 'oklch(0.65 0.2 25)'
const GOLD = 'oklch(0.66 0.14 78)'

describe('MTListChip', () => {
  it("kind='boxoffice' + from=true renders 'from $25', star glyph, generic chrome, 6px gap", () => {
    const { container } = render(
      <MTListChip price={25} kind="boxoffice" from={true} />,
    )
    expect(screen.getByText('from $25')).toBeDefined()
    // Star glyph: svg child exists
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // Outer span uses generic surface-1 background, 6px gap
    const outer = container.firstChild as HTMLElement
    expect(outer.style.gap).toBe('6px')
    expect(outer.style.background).toBe('var(--surface-1)')
    expect(outer.style.border).toBe('1px solid var(--border)')
    // No "resale" text
    expect(screen.queryByText('resale')).toBeNull()
  })

  it("kind='boxoffice' price text uses gold color", () => {
    const { container } = render(
      <MTListChip price={25} kind="boxoffice" from={true} />,
    )
    // Find the text-bearing span
    const priceSpan = screen.getByText('from $25') as HTMLElement
    expect(priceSpan.style.color).toBe(GOLD)
    // ensure container ref used
    expect(container).toBeDefined()
  })

  it("kind='community' + from=true renders 'from $25' in default fg, generic chrome, 6px gap, no glyph", () => {
    const { container } = render(
      <MTListChip price={25} kind="community" from={true} />,
    )
    expect(screen.getByText('from $25')).toBeDefined()
    // No svg
    expect(container.querySelector('svg')).toBeNull()
    const outer = container.firstChild as HTMLElement
    expect(outer.style.gap).toBe('6px')
    expect(outer.style.background).toBe('var(--surface-1)')
    const priceSpan = screen.getByText('from $25') as HTMLElement
    expect(priceSpan.style.color).toBe('var(--fg)')
  })

  it("kind='resale' + from=true renders 'from $85' in coral with always-present mono 'resale' tag, coral chrome, 7px gap", () => {
    const { container } = render(
      <MTListChip price={85} kind="resale" from={true} />,
    )
    expect(screen.getByText('from $85')).toBeDefined()
    // ALWAYS-PRESENT resale tag (Appendix A.3 lock)
    expect(screen.getByText('resale')).toBeDefined()
    const outer = container.firstChild as HTMLElement
    expect(outer.style.gap).toBe('7px') // NOTE: 7px not 6px
    // Coral-tinted background + border (color-mix string preserved verbatim)
    expect(outer.style.background).toContain('color-mix')
    expect(outer.style.background).toContain(RESALE)
    expect(outer.style.border).toContain('color-mix')
    expect(outer.style.border).toContain(RESALE)
    const priceSpan = screen.getByText('from $85') as HTMLElement
    expect(priceSpan.style.color).toBe(RESALE_NORM)
  })

  it("kind='resale' + from=false renders '$85' with resale tag STILL PRESENT (tag does not depend on from)", () => {
    render(<MTListChip price={85} kind="resale" from={false} />)
    expect(screen.getByText('$85')).toBeDefined()
    expect(screen.queryByText('from $85')).toBeNull()
    // Resale tag literal text MUST be in DOM regardless of `from` (Appendix A.3 lock)
    expect(screen.getByText('resale')).toBeDefined()
  })

  it('kind=null (no source) renders fg-muted price, generic chrome, no glyph, no tag', () => {
    const { container } = render(
      <MTListChip price={25} kind={null} from={true} />,
    )
    expect(screen.getByText('from $25')).toBeDefined()
    expect(container.querySelector('svg')).toBeNull()
    const priceSpan = screen.getByText('from $25') as HTMLElement
    expect(priceSpan.style.color).toBe('var(--fg-muted)')
    expect(screen.queryByText('resale')).toBeNull()
    const outer = container.firstChild as HTMLElement
    expect(outer.style.background).toBe('var(--surface-1)')
  })

  it("from=false on non-resale kinds drops the 'from' prefix", () => {
    render(<MTListChip price={25} kind="boxoffice" from={false} />)
    expect(screen.getByText('$25')).toBeDefined()
    expect(screen.queryByText('from $25')).toBeNull()
  })
})
