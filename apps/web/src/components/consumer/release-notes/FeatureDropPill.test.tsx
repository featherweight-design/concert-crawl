// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Release } from '@/lib/definitions/releases'
import { FeatureDropPill } from './FeatureDropPill'

const RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  items: [],
  spotlight: {
    title: 'Submit a price.',
    tagline: 'Community pricing.',
    hero: 'map',
    steps: [{ caption: 'Step one.' }],
  },
}

describe('FeatureDropPill', () => {
  it('renders the spotlight title', () => {
    render(<FeatureDropPill release={RELEASE} onOpen={vi.fn()} />)
    expect(screen.getByText('Submit a price.')).toBeTruthy()
  })

  it('calls onOpen when pill button is clicked', () => {
    const onOpen = vi.fn()
    render(<FeatureDropPill release={RELEASE} onOpen={onOpen} />)
    fireEvent.click(screen.getAllByRole('button')[0]!)
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when dismiss X is clicked (without triggering onOpen)', () => {
    const onOpen = vi.fn()
    const onDismiss = vi.fn()
    render(
      <FeatureDropPill
        release={RELEASE}
        onOpen={onOpen}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('returns null when release has no spotlight', () => {
    const noSpotlight: Release = {
      version: 'v0.4.0-beta',
      date: 'Apr 15, 2026',
      items: [],
    }
    const { container } = render(
      <FeatureDropPill release={noSpotlight} onOpen={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
