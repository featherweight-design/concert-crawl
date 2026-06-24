// @vitest-environment jsdom

import React from 'react'
import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Stub CounterSubmitSheet — it pulls Clerk auth via a deep import chain
// that needs the full Next.js + Clerk runtime. The pill + anchor logic
// under test lives entirely outside the sheet.
vi.mock('./CounterSubmitSheet', () => ({
  CounterSubmitSheet: () => null,
}))

import {
  DisputedPriceCard,
  type DisputedPriceCardProps,
} from './DisputedPriceCard'

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

const minutesAgo = (mins: number): string =>
  new Date(NOW.getTime() - mins * 60_000).toISOString()

const buildProps = (
  overrides: Partial<DisputedPriceCardProps> = {},
): DisputedPriceCardProps => ({
  floor: 32,
  tier: 'GA',
  vendor: 'AXS',
  kind: 'community',
  submitter: { handle: 'fan-1' },
  liveSubmittedAt: minutesAgo(60),
  confirmsCount: 2,
  disputer: { handle: 'fan-2' },
  disputeFloor: 40,
  disputedAt: minutesAgo(5),
  eventId: 'evt-1',
  disputedSubmissionId: 'sub-parent',
  ...overrides,
})

describe('DisputedPriceCard', () => {
  describe('admin defer pill', () => {
    it("renders the 'Admin requested more info' pill when lastAdminActionKind === 'defer'", () => {
      render(
        <DisputedPriceCard {...buildProps({ lastAdminActionKind: 'defer' })} />,
      )
      expect(screen.getByText(/admin requested more info/i)).toBeTruthy()
    })

    it('does NOT render the pill when lastAdminActionKind is null', () => {
      render(
        <DisputedPriceCard {...buildProps({ lastAdminActionKind: null })} />,
      )
      expect(screen.queryByText(/admin requested more info/i)).toBeNull()
    })

    it('does NOT render the pill when lastAdminActionKind is omitted', () => {
      render(<DisputedPriceCard {...buildProps()} />)
      expect(screen.queryByText(/admin requested more info/i)).toBeNull()
    })
  })

  describe('anchor target for counter pointer', () => {
    it('sets id="counter-<counterSubmissionId>" on the card root', () => {
      const { container } = render(
        <DisputedPriceCard
          {...buildProps({ counterSubmissionId: 'sub-counter-xyz' })}
        />,
      )
      const anchored = container.querySelector('#counter-sub-counter-xyz')
      expect(anchored).not.toBeNull()
    })

    it('falls back to disputedSubmissionId when counterSubmissionId is null', () => {
      const { container } = render(
        <DisputedPriceCard
          {...buildProps({
            counterSubmissionId: null,
            disputedSubmissionId: 'sub-parent-abc',
          })}
        />,
      )
      const anchored = container.querySelector('#counter-sub-parent-abc')
      expect(anchored).not.toBeNull()
    })
  })
})
