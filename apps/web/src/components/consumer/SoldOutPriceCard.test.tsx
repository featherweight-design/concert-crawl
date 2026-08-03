// @vitest-environment jsdom

import React from 'react'
import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SoldOutPriceCard } from './SoldOutPriceCard'

const NOW = new Date('2026-06-24T12:00:00.000Z')

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  vi.useRealTimers()
})

afterEach(() => {
  cleanup()
})

describe('SoldOutPriceCard', () => {
  describe('variant="has-listing" (default)', () => {
    it('renders strikethrough price, Sold-out pill, and reporter caption', () => {
      render(
        <SoldOutPriceCard
          priceMin={25}
          priceMax={45}
          reporterHandle="ada"
          confirmsCount={3}
          reportedAt={new Date(NOW.getTime() - 15 * 60_000).toISOString()}
        />,
      )

      const price = screen.getByText('$25–$45')
      expect(price).toBeDefined()
      const priceEl = price as HTMLElement
      expect(priceEl.style.textDecoration).toContain('line-through')

      expect(screen.getByText('Sold out')).toBeDefined()
      expect(
        screen.getByText('Reported sold out by @ada · 3 fans confirmed'),
      ).toBeDefined()
      // "as of 15m ago, could be stale · @ada"
      expect(
        screen.getByText(/as of 15m ago, could be stale · @ada/),
      ).toBeDefined()
    })

    it('omits @handle when reporterHandle is null', () => {
      render(
        <SoldOutPriceCard
          priceMin={25}
          priceMax={null}
          reporterHandle={null}
          confirmsCount={1}
          reportedAt={new Date(NOW.getTime() - 90 * 60_000).toISOString()}
        />,
      )
      expect(
        screen.getByText('Reported sold out · 1 fan confirmed'),
      ).toBeDefined()
      expect(screen.getByText(/as of 1h ago, could be stale/)).toBeDefined()
    })
  })

  describe('variant="no-listing" (Q1 lock — Appendix A.2)', () => {
    it('renders em-dash price (no strikethrough), Sold-out pill, and no-listing caption', () => {
      render(<SoldOutPriceCard variant="no-listing" />)

      const price = screen.getByText('—')
      expect(price).toBeDefined()
      const priceEl = price as HTMLElement
      // no strikethrough — addendum-specified
      expect(priceEl.style.textDecoration).not.toContain('line-through')

      expect(screen.getByText('Sold out')).toBeDefined()
      expect(
        screen.getByText(
          'No tickets listed anywhere we can see — not even resale.',
        ),
      ).toBeDefined()
    })

    it('does not render reporter caption when no-listing', () => {
      render(<SoldOutPriceCard variant="no-listing" />)
      // The reporter caption is gone in no-listing mode.
      expect(screen.queryByText(/Reported sold out/)).toBeNull()
      expect(screen.queryByText(/as of/)).toBeNull()
    })
  })
})
