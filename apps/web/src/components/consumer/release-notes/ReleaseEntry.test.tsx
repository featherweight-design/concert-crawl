// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Release } from '@/lib/definitions/releases'
import { ReleaseEntry } from './ReleaseEntry'

const BASE_RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  headline: 'Community pricing is here.',
  items: [
    { kind: 'added', text: 'Price submission feature.' },
    { kind: 'fixed', text: 'Watching list flash fixed.' },
  ],
}

const SPOTLIGHT_RELEASE: Release = {
  ...BASE_RELEASE,
  spotlight: {
    title: 'Submit a price.',
    tagline: 'Community pricing.',
    hero: 'map',
    steps: [{ caption: 'Step one.' }],
  },
}

describe('ReleaseEntry', () => {
  it('renders version and date', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.getByText('v0.5.0-beta')).toBeTruthy()
    expect(screen.getByText('May 8, 2026')).toBeTruthy()
  })

  it('renders headline when present', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.getByText('Community pricing is here.')).toBeTruthy()
  })

  it('renders release items', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.getByText('Price submission feature.')).toBeTruthy()
    expect(screen.getByText('Watching list flash fixed.')).toBeTruthy()
  })

  it('shows Live badge when isLatest', () => {
    render(<ReleaseEntry release={BASE_RELEASE} isLatest />)
    expect(screen.getByText('Live')).toBeTruthy()
  })

  it('does not show Live badge when not isLatest', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.queryByText('Live')).toBeNull()
  })

  it('does not render spotlight strip when no spotlight', () => {
    render(<ReleaseEntry release={BASE_RELEASE} />)
    expect(screen.queryByText('Feature drop · announcement')).toBeNull()
  })

  it('renders spotlight strip when spotlight present', () => {
    render(<ReleaseEntry release={SPOTLIGHT_RELEASE} />)
    expect(screen.getByText('Feature drop · announcement')).toBeTruthy()
  })

  it('calls onOpenSpotlight when spotlight strip clicked', () => {
    const onOpenSpotlight = vi.fn()
    render(
      <ReleaseEntry
        release={SPOTLIGHT_RELEASE}
        onOpenSpotlight={onOpenSpotlight}
      />,
    )
    fireEvent.click(screen.getByText('See the announcement'))
    expect(onOpenSpotlight).toHaveBeenCalledWith(SPOTLIGHT_RELEASE)
  })
})
