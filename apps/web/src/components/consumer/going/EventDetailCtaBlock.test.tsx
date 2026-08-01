// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ApiError } from '@/lib/api'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'
import { GOING_COPY } from './definitions/copy'
import type { GoingCtaEvent } from './EventDetailCtaBlock'

let entitlement: EntitlementResult = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
}
const mutate = vi.fn()
const refresh = vi.fn()
let isPending = false

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}))
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: null }),
}))
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutate, isPending }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

const { EventDetailCtaBlock } = await import('./EventDetailCtaBlock')

const event = (over: Partial<GoingCtaEvent> = {}): GoingCtaEvent => ({
  id: 'ev1',
  artist: 'Khruangbin',
  // Far future so it never drifts into the past as the suite ages.
  date: '2099-10-14',
  status: 'upcoming',
  attendingAt: null,
  venue: { timezone: 'America/Denver' },
  ...over,
})

const renderBlock = (over: Partial<GoingCtaEvent> = {}) =>
  render(<EventDetailCtaBlock event={event(over)} scaRegion={false} />)

describe('EventDetailCtaBlock', () => {
  beforeEach(() => {
    mutate.mockReset()
    refresh.mockReset()
    isPending = false
    entitlement = { isLoading: false, active: true, surface: 'visible-active' }
  })
  afterEach(cleanup)

  it('offers the commitment on an upcoming show the user has not marked', () => {
    renderBlock()
    expect(screen.getByRole('button')).toHaveTextContent(
      GOING_COPY.button.default,
    )
  })

  it('reflects the commitment on an upcoming show already marked', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' })
    expect(screen.getByRole('button')).toHaveTextContent(
      GOING_COPY.button.going,
    )
  })

  it('shows the attended state on a past show that was marked', () => {
    renderBlock({ date: '2020-10-14', attendingAt: '2020-10-14T00:00:00.000Z' })
    expect(screen.getByRole('button')).toHaveTextContent('You went')
  })

  it('shows the declined state on a past show that was never marked', () => {
    renderBlock({ date: '2020-10-14' })
    expect(screen.getByRole('button')).toHaveTextContent(
      GOING_COPY.button.pastNo,
    )
  })

  it('renders nothing for a cancelled show', () => {
    const { container } = renderBlock({ status: 'cancelled' })
    expect(container).toBeEmptyDOMElement()
  })

  it('holds rendering while the plan resolves rather than flashing a lock', () => {
    entitlement = { isLoading: true, active: false, surface: null }
    const { container } = renderBlock()
    expect(container).toBeEmptyDOMElement()
  })

  it('commits and refreshes the server-rendered page on tap', () => {
    renderBlock()
    fireEvent.click(screen.getByRole('button'))
    expect(mutate).toHaveBeenCalledWith(
      { eventId: 'ev1', going: true },
      expect.anything(),
    )
  })

  it('releases the commitment when tapped while going', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' })
    fireEvent.click(screen.getByRole('button'))
    expect(mutate).toHaveBeenCalledWith(
      { eventId: 'ev1', going: false },
      expect.anything(),
    )
  })

  it('routes a locked tap to the upgrade path instead of mutating', () => {
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    renderBlock()
    fireEvent.click(screen.getByRole('button'))
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'paywall',
    )
  })

  it('sends a logged-out tap straight to the picker', () => {
    entitlement = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    }
    renderBlock()
    fireEvent.click(screen.getByRole('button'))
    // Not `logged-out-paywall`: this reach is for Concert History, and the
    // entry keys the gate's copy as well as the funnel dimension.
    expect(screen.getByTestId('tier-picker')).toHaveAttribute(
      'data-entry',
      'logged-out-going',
    )
  })

  it('explains what the two affordances do before a commitment exists', () => {
    renderBlock()
    expect(screen.getByText(GOING_COPY.support.default)).toBeInTheDocument()
  })

  it('promises the history entry once committed', () => {
    renderBlock({ attendingAt: '2026-01-01T00:00:00.000Z' })
    expect(screen.getByText(GOING_COPY.support.going)).toBeInTheDocument()
  })

  it('surfaces a failure without leaving the row silent', () => {
    mutate.mockImplementation((_input, options) => options.onError())
    renderBlock()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(GOING_COPY.error.failed)).toBeInTheDocument()
  })

  it('routes a server-side entitlement 403 to the upgrade path, not the error line', () => {
    mutate.mockImplementation((_input, options) =>
      options.onError(
        new ApiError(403, 'Upgrade required', 'entitlement_required'),
      ),
    )
    renderBlock()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('tier-picker')).toBeInTheDocument()
    expect(screen.queryByText(GOING_COPY.error.failed)).toBeNull()
  })

  it('refreshes the page after a successful commitment', () => {
    mutate.mockImplementation((_input, options) => options.onSuccess())
    renderBlock()
    fireEvent.click(screen.getByRole('button'))
    expect(refresh).toHaveBeenCalled()
  })

  it('disables the commitment while the toggle is in flight', () => {
    isPending = true
    renderBlock()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
