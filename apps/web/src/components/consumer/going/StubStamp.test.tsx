// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { StubStamp } from './StubStamp'
import { stampAccentFor, stampGlyphFor } from './lib/stamp'

const svgOf = (container: HTMLElement): SVGSVGElement => {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('no svg rendered')
  return svg
}

describe('StubStamp', () => {
  afterEach(cleanup)

  it('renders at the passed size', () => {
    const { container } = render(<StubStamp artist="Khruangbin" size={38} />)
    const svg = svgOf(container)
    expect(svg.getAttribute('width')).toBe('38')
    expect(svg.getAttribute('height')).toBe('38')
  })

  it('defaults to the 28px row size', () => {
    const { container } = render(<StubStamp artist="Khruangbin" />)
    expect(svgOf(container).getAttribute('width')).toBe('28')
  })

  it('derives the accent from the artist when not overridden', () => {
    const { container } = render(<StubStamp artist="Khruangbin" />)
    expect(container.innerHTML).toContain(stampAccentFor('Khruangbin'))
  })

  it('honours an accent override', () => {
    const { container } = render(
      <StubStamp artist="Khruangbin" accent="#123456" />,
    )
    expect(container.innerHTML).toContain('#123456')
    expect(container.innerHTML).not.toContain(stampAccentFor('Khruangbin'))
  })

  it('renders the glyph the artist maps to', () => {
    // The ring glyph is the only one drawn as a <circle>, so it is the
    // cheapest glyph choice to assert structurally.
    const { container } = render(<StubStamp artist="Khruangbin" glyph="ring" />)
    expect(container.querySelector('circle')).not.toBeNull()
  })

  it('renders each glyph kind distinctly', () => {
    const shapes = (['star', 'diamond', 'triangle'] as const).map((glyph) => {
      const { container } = render(
        <StubStamp artist="Khruangbin" glyph={glyph} />,
      )
      return container.querySelector('polygon')?.getAttribute('points')
    })
    expect(new Set(shapes).size).toBe(3)
  })

  it('is decorative by default', () => {
    const { container } = render(<StubStamp artist="Khruangbin" />)
    const svg = svgOf(container)
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
  })

  it('becomes an image when given a label', () => {
    const { container } = render(
      <StubStamp artist="Khruangbin" aria-label="You went" />,
    )
    const svg = svgOf(container)
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-label')).toBe('You went')
    expect(svg.getAttribute('aria-hidden')).toBeNull()
  })

  it('always draws the perforation between the two stub halves', () => {
    const { container } = render(<StubStamp artist="Khruangbin" />)
    expect(container.querySelector('line')).not.toBeNull()
    expect(container.querySelectorAll('path')).toHaveLength(2)
  })

  it('uses the artist glyph when none is passed', () => {
    const glyph = stampGlyphFor('Khruangbin')
    const { container } = render(<StubStamp artist="Khruangbin" />)
    const hasCircle = container.querySelector('circle') !== null
    expect(hasCircle).toBe(glyph === 'ring')
  })
})
