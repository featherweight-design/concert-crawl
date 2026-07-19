// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  FollowingChip,
  HeroFollowingBadge,
  DetailFollowStrip,
} from './FollowHighlight'

afterEach(() => {
  cleanup()
})

describe('FollowingChip', () => {
  it('renders the Following label with a screen-reader Spotify clarification', () => {
    render(<FollowingChip />)
    expect(screen.getByText('Following')).toBeDefined()
    expect(screen.getByText('You follow this artist on Spotify')).toBeDefined()
  })

  it('carries the Spotify glyph, not the accent treatment', () => {
    const { container } = render(<FollowingChip />)
    // The Spotify logo is the only glyph in the chip.
    expect(container.querySelector('svg')).not.toBeNull()
    // Design lock: --accent is reserved for Watching — the chip is neutral.
    const chip = container.firstElementChild
    if (!(chip instanceof HTMLElement)) throw new Error('chip did not render')
    expect(chip.className).not.toContain('accent')
    expect(chip.className).toContain('bg-surface-3')
  })
})

describe('HeroFollowingBadge', () => {
  it('renders the Following label with a screen-reader Spotify clarification', () => {
    render(<HeroFollowingBadge />)
    expect(screen.getByText('Following')).toBeDefined()
    expect(screen.getByText('You follow this artist on Spotify')).toBeDefined()
  })

  it('is neutral (surface-1) — never the accent eyebrow treatment', () => {
    const { container } = render(<HeroFollowingBadge />)
    const badge = container.firstElementChild
    if (!(badge instanceof HTMLElement)) throw new Error('badge did not render')
    expect(badge.className).not.toContain('accent')
    expect(badge.className).toContain('bg-surface-1')
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('DetailFollowStrip', () => {
  it('returns null for an empty artist list', () => {
    const { container } = render(<DetailFollowStrip artists={[]} />)
    expect(container.firstElementChild).toBeNull()
  })

  it('single artist — "You follow X on Spotify"', () => {
    render(<DetailFollowStrip artists={['Phoebe Bridgers']} />)
    expect(
      screen.getByText('You follow Phoebe Bridgers on Spotify'),
    ).toBeDefined()
  })

  it('two artists — joined with "and", no comma', () => {
    render(<DetailFollowStrip artists={['Wednesday', 'MJ Lenderman']} />)
    expect(
      screen.getByText('You follow Wednesday and MJ Lenderman on Spotify'),
    ).toBeDefined()
  })

  it('three artists — Oxford-comma list join', () => {
    render(<DetailFollowStrip artists={['A', 'B', 'C']} />)
    expect(screen.getByText('You follow A, B, and C on Spotify')).toBeDefined()
  })
})
