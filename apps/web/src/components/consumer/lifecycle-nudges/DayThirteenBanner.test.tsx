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

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { DayThirteenBanner } from './DayThirteenBanner'
import { LIFECYCLE_NUDGES_COPY } from './definitions/copy'
import { PLAN_SETTINGS_ROUTE } from '@/components/consumer/tier-picker/definitions/constants'

const BANNER_COPY = LIFECYCLE_NUDGES_COPY.banner

describe('DayThirteenBanner', () => {
  it('pinned variant renders title, sub, and a fixed wrapper', () => {
    render(<DayThirteenBanner variant="pinned" onDismiss={vi.fn()} />)
    const strip = screen.getByTestId('day-thirteen-banner')
    expect(screen.getByText(BANNER_COPY.title)).toBeTruthy()
    expect(screen.getByText(BANNER_COPY.sub)).toBeTruthy()
    const wrapper = strip.parentElement
    expect(wrapper?.style.position).toBe('fixed')
    expect(wrapper?.style.top).toBe('0px')
  })

  it('inline variant renders rounded without the fixed wrapper', () => {
    render(<DayThirteenBanner variant="inline" onDismiss={vi.fn()} />)
    const strip = screen.getByTestId('day-thirteen-banner')
    expect(strip.style.borderRadius).toBe('12px')
    expect(strip.parentElement?.style.position).not.toBe('fixed')
  })

  it('CTA routes to Settings · Plan with the auto-open param', () => {
    render(<DayThirteenBanner variant="pinned" onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: BANNER_COPY.cta }))
    expect(mockPush).toHaveBeenCalledWith(PLAN_SETTINGS_ROUTE)
  })

  it('dismiss X fires onDismiss', () => {
    const onDismiss = vi.fn()
    render(<DayThirteenBanner variant="pinned" onDismiss={onDismiss} />)
    fireEvent.click(
      screen.getByRole('button', { name: BANNER_COPY.dismissAria }),
    )
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
