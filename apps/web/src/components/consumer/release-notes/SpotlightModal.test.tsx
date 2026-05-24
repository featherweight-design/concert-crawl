// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeAll } from 'vitest'
import type { Release } from '@/lib/definitions/releases'
import { SpotlightModal } from './SpotlightModal'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const RELEASE: Release = {
  version: 'v0.5.0-beta',
  date: 'May 8, 2026',
  items: [],
  spotlight: {
    title: 'Submit a price. Help the next fan.',
    tagline: 'Community-sourced ticket prices.',
    hero: 'map',
    cta: 'Try it',
    ctaHref: '/events',
    steps: [{ caption: 'Step one caption.' }, { caption: 'Step two caption.' }],
    founderNote: 'Some founder note.',
    founderSign: '— Hugh',
  },
}

describe('SpotlightModal', () => {
  it('renders spotlight title and tagline', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    expect(screen.getByText('Submit a price. Help the next fan.')).toBeTruthy()
    expect(screen.getByText('Community-sourced ticket prices.')).toBeTruthy()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SpotlightModal release={RELEASE} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when "Maybe later" is clicked', () => {
    const onClose = vi.fn()
    render(<SpotlightModal release={RELEASE} onClose={onClose} />)
    fireEvent.click(screen.getByText('Maybe later'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows step 1 caption initially', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    expect(screen.getByText('Step one caption.')).toBeTruthy()
  })

  it('advances to step 2 when Next is clicked', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Next →'))
    expect(screen.getByText('Step two caption.')).toBeTruthy()
  })

  it('calls onCTA when CTA button is clicked', () => {
    const onCTA = vi.fn()
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} onCTA={onCTA} />)
    fireEvent.click(screen.getByText('Try it'))
    expect(onCTA).toHaveBeenCalledOnce()
  })

  it('renders founder note', () => {
    render(<SpotlightModal release={RELEASE} onClose={vi.fn()} />)
    expect(screen.getByText('Some founder note.')).toBeTruthy()
  })

  it('returns null when release has no spotlight', () => {
    const releaseNoSpotlight: Release = {
      version: 'v0.4.0-beta',
      date: 'Apr 15, 2026',
      items: [],
    }
    const { container } = render(
      <SpotlightModal release={releaseNoSpotlight} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
