// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

import { PastDueBanner } from './PastDueBanner'
import { LIFECYCLE_NUDGES_COPY } from './definitions/copy'

const BANNER_COPY = LIFECYCLE_NUDGES_COPY.pastDueBanner

const renderBanner = (
  overrides: Partial<{
    variant: 'pinned' | 'inline'
    onDismiss: () => void
    onUpdateCard: () => void
    updateCardPending: boolean
  }> = {},
) =>
  render(
    <PastDueBanner
      variant={overrides.variant ?? 'pinned'}
      onDismiss={overrides.onDismiss ?? vi.fn()}
      onUpdateCard={overrides.onUpdateCard ?? vi.fn()}
      updateCardPending={overrides.updateCardPending ?? false}
    />,
  )

describe('PastDueBanner', () => {
  it('renders headline, sub, CTA, and dismiss with the copy constants', () => {
    renderBanner()
    expect(screen.getByText(BANNER_COPY.headline)).toBeTruthy()
    expect(screen.getByText(BANNER_COPY.sub)).toBeTruthy()
    expect(screen.getByRole('button', { name: BANNER_COPY.cta })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: BANNER_COPY.dismissAria }),
    ).toBeTruthy()
  })

  it('exposes the region role with aria-label and aria-live polite', () => {
    renderBanner()
    const region = screen.getByRole('region', {
      name: BANNER_COPY.regionAria,
    })
    expect(region.getAttribute('aria-live')).toBe('polite')
  })

  it('pinned variant renders square corners inside a fixed wrapper', () => {
    renderBanner({ variant: 'pinned' })
    const strip = screen.getByTestId('past-due-banner')
    expect(strip.style.borderRadius).toBe('0px')
    const wrapper = strip.parentElement
    expect(wrapper?.style.position).toBe('fixed')
    expect(wrapper?.style.top).toBe('0px')
  })

  it('inline variant renders rounded without the fixed wrapper', () => {
    renderBanner({ variant: 'inline' })
    const strip = screen.getByTestId('past-due-banner')
    expect(strip.style.borderRadius).toBe('12px')
    expect(strip.parentElement?.style.position).not.toBe('fixed')
  })

  it('dismiss X fires onDismiss', () => {
    const onDismiss = vi.fn()
    renderBanner({ onDismiss })
    fireEvent.click(
      screen.getByRole('button', { name: BANNER_COPY.dismissAria }),
    )
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('CTA fires onUpdateCard', () => {
    const onUpdateCard = vi.fn()
    renderBanner({ onUpdateCard })
    fireEvent.click(screen.getByRole('button', { name: BANNER_COPY.cta }))
    expect(onUpdateCard).toHaveBeenCalledTimes(1)
  })

  it('updateCardPending disables the CTA', () => {
    const onUpdateCard = vi.fn()
    renderBanner({ onUpdateCard, updateCardPending: true })
    const cta = screen.getByRole('button', { name: BANNER_COPY.cta })
    expect(cta.hasAttribute('disabled')).toBe(true)
    fireEvent.click(cta)
    expect(onUpdateCard).not.toHaveBeenCalled()
  })
})
