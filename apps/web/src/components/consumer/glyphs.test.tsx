// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TierMark } from './glyphs'

afterEach(() => {
  cleanup()
})

describe('TierMark', () => {
  it('renders its children as the label text', () => {
    render(<TierMark kind="boxoffice">Box office</TierMark>)
    expect(screen.getByText('Box office')).toBeTruthy()
  })

  it('renders a gold star SVG with the TierMark-specific 12×12 viewBox when kind="boxoffice" and glyph=true', () => {
    const { container } = render(
      <TierMark kind="boxoffice" glyph>
        Box office
      </TierMark>,
    )

    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    // CRITICAL: TierMark's boxoffice star uses an inline 12×12 viewBox SVG —
    // it is NOT the shipped 10×10 StarGlyph. Per property table §primitives
    // line 48, the two stars coexist intentionally: StarGlyph is chip-scale
    // (10×10), TierMark carries a fuller eyebrow-scale star (12×12).
    expect(svg?.getAttribute('viewBox')).toBe('0 0 12 12')
    expect(svg?.getAttribute('viewBox')).not.toBe('0 0 10 10')

    // The path d must match the TierMark-specific star geometry, not the
    // shipped StarGlyph's path.
    const path = svg?.querySelector('path')
    expect(path?.getAttribute('d')).toBe(
      'M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z',
    )

    // Filled with the gold tier color.
    expect(svg?.getAttribute('fill')).toBe('oklch(0.66 0.14 78)')
  })

  it('omits the star SVG when glyph=false (default)', () => {
    const { container } = render(
      <TierMark kind="boxoffice">Box office</TierMark>,
    )
    expect(container.querySelector('svg')).toBeNull()
  })

  it('omits the star SVG for non-boxoffice kinds even when glyph=true', () => {
    const { container: resaleContainer } = render(
      <TierMark kind="resale" glyph>
        Resale
      </TierMark>,
    )
    expect(resaleContainer.querySelector('svg')).toBeNull()

    const { container: communityContainer } = render(
      <TierMark kind="community" glyph>
        Community
      </TierMark>,
    )
    expect(communityContainer.querySelector('svg')).toBeNull()
  })

  it('applies the resale coral color to the wrapper', () => {
    const { container } = render(<TierMark kind="resale">Resale</TierMark>)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    // oklch(0.65 0.20 25) is the resale coral token.
    expect(span?.style.color).toContain('oklch(0.65 0.2 25)')
  })

  it('applies the community azure color to the wrapper (shared primitive — detail-surface use)', () => {
    // TierMark is a shared primitive. The community-azure styling here is for
    // the detail-surface call sites; browse chips do NOT consume TierMark.
    const { container } = render(
      <TierMark kind="community">Community</TierMark>,
    )
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    // oklch(0.62 0.12 240) is the community azure token.
    expect(span?.style.color).toContain('oklch(0.62 0.12 240)')
  })
})
