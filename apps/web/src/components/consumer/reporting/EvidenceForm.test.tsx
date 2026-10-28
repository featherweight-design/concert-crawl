// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ER_POLICY } from '@concert-crawl/types'
import { EvidenceForm } from './EvidenceForm'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.evidenceForm

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token' }),
}))
vi.mock('@/lib/events', () => ({ fileEventReport: vi.fn() }))

const renderForm = (eventDate: string) =>
  render(
    <EvidenceForm
      open
      onClose={vi.fn()}
      reportType="cancelled"
      eventId="event-1"
      eventDate={eventDate}
    />,
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
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

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('EvidenceForm confirm threshold', () => {
  it('quotes the usual count for a show more than a week out', () => {
    renderForm('2026-11-20')
    expect(
      screen.getByText(copy.promotionNote(ER_POLICY.confirmsRequired)),
    ).toBeTruthy()
  })

  it('quotes the imminent count in the footer, matching the warning, on the threshold day', () => {
    // Exactly imminentThresholdDays out: the API counts this day as imminent.
    renderForm('2026-11-05')
    expect(
      screen.getByText(copy.promotionNote(ER_POLICY.confirmsRequiredImminent)),
    ).toBeTruthy()
    expect(
      screen.getByText(
        copy.imminentWarning(
          ER_POLICY.imminentThresholdDays,
          ER_POLICY.confirmsRequiredImminent,
          ER_POLICY.confirmsRequired,
        ),
      ),
    ).toBeTruthy()
    expect(
      screen.queryByText(copy.promotionNote(ER_POLICY.confirmsRequired)),
    ).toBeNull()
  })
})
