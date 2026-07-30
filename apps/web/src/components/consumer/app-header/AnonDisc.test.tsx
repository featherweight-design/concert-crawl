// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { AnonDisc } from './AnonDisc'

afterEach(cleanup)

describe('AnonDisc', () => {
  it('renders a resolved disc, never a loading state', () => {
    const { container } = render(<AnonDisc size={36} />)
    expect(container.querySelector('[data-loading]')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('holds a 44px hit floor even at a small size prop', () => {
    const { container } = render(<AnonDisc size={26} />)
    const root = container.firstElementChild
    expect(root instanceof HTMLElement).toBe(true)
    if (!(root instanceof HTMLElement)) return
    expect(root.style.minWidth).toBe('44px')
    expect(root.style.minHeight).toBe('44px')
  })

  it('draws the disc from tokens, never a hex value', () => {
    const { container } = render(<AnonDisc size={36} />)
    const disc = container.querySelector('span > span')
    expect(disc instanceof HTMLElement).toBe(true)
    if (!(disc instanceof HTMLElement)) return
    expect(disc.style.background).toBe('var(--surface-2)')
    expect(disc.style.border).toContain('var(--border-strong)')
    expect(disc.style.color).toBe('var(--fg-muted)')
  })
})
