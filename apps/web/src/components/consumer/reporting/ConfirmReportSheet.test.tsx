// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ConfirmReportSheet } from './ConfirmReportSheet'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.confirmReportSheet

let isSignedIn = true
let isLoaded = true

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded, isSignedIn, getToken: async () => 'token' }),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ entry }: { entry: string }) => (
    <div data-testid="tier-picker" data-entry={entry} />
  ),
}))

const renderSheet = () =>
  render(
    <ConfirmReportSheet
      open
      onClose={vi.fn()}
      reportType="cancelled"
      reporter={null}
      reportedAt="2026-09-01T02:00:00.000Z"
      eventId="evt_1"
      reportId="rep_1"
      onFileCounter={vi.fn()}
    />,
  )

beforeEach(() => {
  isSignedIn = true
  isLoaded = true

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

describe('ConfirmReportSheet', () => {
  afterEach(cleanup)

  it('shows the confirm surface to a signed-in user', () => {
    renderSheet()

    expect(screen.queryByTestId('tier-picker')).toBe(null)
    expect(screen.getByText(copy.confirmButton)).toBeTruthy()
  })

  it('sends a signed-out visitor to the tier picker', () => {
    isSignedIn = false
    renderSheet()

    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'logged-out-report',
    )
    // The confirm button used to render and then silently no-op, because
    // getToken() returned null and handleConfirm bailed without saying so.
    expect(screen.queryByText(copy.confirmButton)).toBe(null)
  })

  it('does not flash the picker while Clerk is still loading', () => {
    isLoaded = false
    isSignedIn = false
    renderSheet()

    expect(screen.queryByTestId('tier-picker')).toBe(null)
  })
})
