// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { HeroFollowingBadge, DetailFollowStrip } from './FollowHighlight'

afterEach(() => {
  cleanup()
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
