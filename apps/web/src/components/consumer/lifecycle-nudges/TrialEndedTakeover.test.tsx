// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FounderWindowView } from '@concert-crawl/types'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseFounderWindow.mockReturnValue({ data: openWindow })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, // desktop
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

const mockUseFounderWindow = vi.fn()
vi.mock('@/lib/queries/use-founder-window', () => ({
  useFounderWindow: (enabled: boolean) => mockUseFounderWindow(enabled),
}))

import { TrialEndedTakeover } from './TrialEndedTakeover'
import { LIFECYCLE_NUDGES_COPY } from './definitions/copy'
import { TIER_PICKER_COPY } from '@/components/consumer/tier-picker/definitions/copy'

const TAKEOVER_COPY = LIFECYCLE_NUDGES_COPY.takeover

const futureClose = new Date(Date.now() + 5 * 86_400_000).toISOString()
const openWindow: FounderWindowView = {
  state: 'open',
  seatsTotal: 100,
  seatsRemaining: 37,
  closesAt: futureClose,
}

const renderTakeover = ({
  onDismiss = vi.fn(),
  onSelectTier = vi.fn(),
} = {}) => {
  render(
    <TrialEndedTakeover onDismiss={onDismiss} onSelectTier={onSelectTier} />,
  )
  return { onDismiss, onSelectTier }
}

describe('TrialEndedTakeover', () => {
  it('renders headline, subhead, and dialog semantics', () => {
    renderTakeover()
    expect(screen.getByText(TAKEOVER_COPY.headline)).toBeTruthy()
    expect(screen.getByText(TAKEOVER_COPY.subhead)).toBeTruthy()
    expect(screen.getByText(TAKEOVER_COPY.eyebrow)).toBeTruthy()
    expect(screen.getByText(TAKEOVER_COPY.code)).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toBe(TAKEOVER_COPY.ariaLabel)
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('renders the locked #781 picker inline (all four tier cards)', () => {
    renderTakeover()
    expect(screen.getByTestId('tier-card-free')).toBeTruthy()
    expect(screen.getByTestId('tier-card-supporter')).toBeTruthy()
    expect(screen.getByTestId('tier-card-premium')).toBeTruthy()
    expect(screen.getByTestId('tier-card-founder')).toBeTruthy()
  })

  it('selecting a paid tier bubbles the tier key to onSelectTier', () => {
    const { onSelectTier, onDismiss } = renderTakeover()
    fireEvent.click(
      screen.getByRole('button', {
        name: TIER_PICKER_COPY.cta.upgradeToPremium,
      }),
    )
    expect(onSelectTier).toHaveBeenCalledWith('premium')
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('dismiss X fires onDismiss', () => {
    const { onDismiss } = renderTakeover()
    fireEvent.click(
      screen.getByRole('button', { name: TAKEOVER_COPY.dismissAria }),
    )
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('bottom "keep browsing" link fires onDismiss', () => {
    const { onDismiss } = renderTakeover()
    fireEvent.click(
      screen.getByRole('button', { name: TAKEOVER_COPY.dismissLink }),
    )
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('Escape fires onDismiss', () => {
    const { onDismiss } = renderTakeover()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('mobile viewport renders the accordion with premium expanded', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true, // mobile
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    renderTakeover()
    expect(screen.getByTestId('tier-row-premium')).toBeTruthy()
    const premiumToggle = screen.getByRole('button', {
      name: new RegExp(TIER_PICKER_COPY.tiers.premium.tagline),
    })
    expect(premiumToggle.getAttribute('aria-expanded')).toBe('true')
  })
})
