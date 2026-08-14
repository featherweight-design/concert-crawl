// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from '@testing-library/react'
import type {
  AcknowledgedFault,
  TriageFault,
} from '@/components/admin/triage/definitions/types'

const mockFetchVenueFault = vi.fn()
const mockAcknowledgeFault = vi.fn()
const mockUnacknowledgeFault = vi.fn()

vi.mock('./lib/acknowledgements', () => ({
  fetchVenueFault: (...args: unknown[]) => mockFetchVenueFault(...args),
  acknowledgeFault: (...args: unknown[]) => mockAcknowledgeFault(...args),
  unacknowledgeFault: (...args: unknown[]) => mockUnacknowledgeFault(...args),
}))

// Clerk hands back a stable `getToken`, so the mock does too. A fresh identity
// per render would put the load effect in a re-fetch loop no production caller
// sees, and a redundant re-fetch would mask a stale response behind it.
const stableGetToken = () => Promise.resolve('test-token')
const clerkLoaded = { current: true }
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: stableGetToken, isLoaded: clerkLoaded.current }),
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { FaultAcknowledgeControl } from './FaultAcknowledgeControl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.faultAcknowledge
const VENUE_ID = '11111111-1111-1111-1111-111111111111'

const ceilingFault: TriageFault = {
  id: 'f-1',
  venueId: VENUE_ID,
  venue: 'Summit',
  band: 'suspect',
  persistedSince: '2026-08-08T09:00:00.000Z',
  days: 6,
  dur: '6d',
  crawlRunId: null,
  condition: 'ceiling',
  evidence: {
    kind: 'pinned_count',
    count: 36,
    runs: 5,
    was: null,
    wasWhen: null,
    furthest: null,
    best: null,
    shrankDays: null,
    series: [],
  },
}

const acknowledged: AcknowledgedFault = {
  ...ceilingFault,
  acknowledgement: {
    evidenceKind: 'pinned_count',
    evidenceValue: '36',
    reason: 'Live Nation caps the list at 36.',
    acknowledgedBy: 'user_admin_1',
    acknowledgedAt: '2026-08-14T03:00:00.000Z',
  },
}

describe('FaultAcknowledgeControl', () => {
  beforeEach(() => {
    mockFetchVenueFault.mockReset()
    mockAcknowledgeFault.mockReset()
    mockUnacknowledgeFault.mockReset()
    clerkLoaded.current = true
    mockRefresh.mockReset()
  })

  afterEach(cleanup)

  it('waits for Clerk rather than reading a pre-hydration null token', async () => {
    clerkLoaded.current = false
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })

    const { rerender } = render(<FaultAcknowledgeControl venueId={VENUE_ID} />)
    // The read sits behind an awaited getToken, so asserting absence here
    // passes vacuously unless the pending microtasks are flushed first.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(mockFetchVenueFault).not.toHaveBeenCalled()

    clerkLoaded.current = true
    rerender(<FaultAcknowledgeControl venueId={VENUE_ID} />)

    expect(await screen.findByText(COPY.acknowledgedTitle)).toBeTruthy()
  })

  it('renders nothing when the venue has no fault and no acknowledgement', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged: null })
    const { container } = render(<FaultAcknowledgeControl venueId={VENUE_ID} />)
    await waitFor(() => expect(mockFetchVenueFault).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('pre-fills the evidence figure from the live fault so it is never retyped', async () => {
    mockFetchVenueFault.mockResolvedValue({
      fault: ceilingFault,
      acknowledged: null,
    })
    render(<FaultAcknowledgeControl venueId={VENUE_ID} />)
    expect(await screen.findByText('36')).toBeTruthy()
  })

  it('will not acknowledge without a reason', async () => {
    mockFetchVenueFault.mockResolvedValue({
      fault: ceilingFault,
      acknowledged: null,
    })
    render(<FaultAcknowledgeControl venueId={VENUE_ID} />)
    const confirm = await screen.findByRole('button', {
      name: COPY.confirm,
    })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    expect(mockAcknowledgeFault).not.toHaveBeenCalled()
  })

  it('sends the derived evidence with the typed reason', async () => {
    mockFetchVenueFault.mockResolvedValue({
      fault: ceilingFault,
      acknowledged: null,
    })
    mockAcknowledgeFault.mockResolvedValue(undefined)
    render(<FaultAcknowledgeControl venueId={VENUE_ID} />)

    const reason = await screen.findByLabelText(COPY.reasonLabel)
    fireEvent.change(reason, {
      target: { value: 'Live Nation caps the list at 36.' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.confirm }))

    await waitFor(() =>
      expect(mockAcknowledgeFault).toHaveBeenCalledWith(
        VENUE_ID,
        {
          condition: 'ceiling',
          evidenceKind: 'pinned_count',
          evidenceValue: '36',
          reason: 'Live Nation caps the list at 36.',
        },
        'test-token',
      ),
    )
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows an existing acknowledgement with its reason and who set it', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })
    render(<FaultAcknowledgeControl venueId={VENUE_ID} />)

    expect(
      await screen.findByText('Live Nation caps the list at 36.'),
    ).toBeTruthy()
    expect(screen.getByText(/user_admin_1/)).toBeTruthy()
  })

  it('un-acknowledges by condition', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })
    mockUnacknowledgeFault.mockResolvedValue(undefined)
    render(<FaultAcknowledgeControl venueId={VENUE_ID} />)

    fireEvent.click(await screen.findByRole('button', { name: COPY.remove }))

    await waitFor(() =>
      expect(mockUnacknowledgeFault).toHaveBeenCalledWith(
        VENUE_ID,
        'ceiling',
        'test-token',
      ),
    )
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('surfaces a failed acknowledgement instead of looking like it worked', async () => {
    mockFetchVenueFault.mockResolvedValue({
      fault: ceilingFault,
      acknowledged: null,
    })
    mockAcknowledgeFault.mockRejectedValue(new Error('Venue not found'))
    render(<FaultAcknowledgeControl venueId={VENUE_ID} />)

    fireEvent.change(await screen.findByLabelText(COPY.reasonLabel), {
      target: { value: 'Expected.' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.confirm }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  // The control lives in a split view, so the operator switches venues without
  // remounting it. A slow read for the venue they left must not paint its
  // acknowledgement over the venue they are now looking at.
  it('ignores a slow read for a venue the operator has already left', async () => {
    const OTHER_ID = '22222222-2222-2222-2222-222222222222'
    let resolveSlow: (value: unknown) => void = () => {}
    mockFetchVenueFault.mockImplementation((venueId: string) => {
      if (venueId === VENUE_ID) {
        return new Promise((resolve) => {
          resolveSlow = resolve
        })
      }
      return Promise.resolve({ fault: null, acknowledged: null })
    })

    const { container, rerender } = render(
      <FaultAcknowledgeControl venueId={VENUE_ID} />,
    )
    rerender(<FaultAcknowledgeControl venueId={OTHER_ID} />)
    await waitFor(() =>
      expect(mockFetchVenueFault).toHaveBeenCalledWith(OTHER_ID, 'test-token'),
    )

    // Settled and flushed before asserting, so an empty panel means the stale
    // result was discarded rather than merely still in flight.
    await act(async () => {
      resolveSlow({ fault: ceilingFault, acknowledged })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(container.textContent).toBe('')
  })

  it('clears the previous venue while the next one is still loading', async () => {
    const OTHER_ID = '22222222-2222-2222-2222-222222222222'
    mockFetchVenueFault.mockImplementation((venueId: string) =>
      venueId === VENUE_ID
        ? Promise.resolve({ fault: null, acknowledged })
        : new Promise(() => {}),
    )

    const { container, rerender } = render(
      <FaultAcknowledgeControl venueId={VENUE_ID} />,
    )
    expect(
      await screen.findByText('Live Nation caps the list at 36.'),
    ).toBeTruthy()

    rerender(<FaultAcknowledgeControl venueId={OTHER_ID} />)
    await waitFor(() => expect(container.textContent).toBe(''))
  })

  // A save left in flight belongs to the venue the operator walked away from.
  // Leaving it to settle would hold the next venue's control disabled.
  it('re-enables the control when the operator switches mid-save', async () => {
    const OTHER_ID = '22222222-2222-2222-2222-222222222222'
    mockFetchVenueFault.mockImplementation((venueId: string) =>
      Promise.resolve(
        venueId === VENUE_ID
          ? { fault: null, acknowledged }
          : { fault: ceilingFault, acknowledged: null },
      ),
    )
    mockUnacknowledgeFault.mockReturnValue(new Promise(() => {}))

    const { rerender } = render(<FaultAcknowledgeControl venueId={VENUE_ID} />)
    fireEvent.click(await screen.findByRole('button', { name: COPY.remove }))
    await waitFor(() => expect(mockUnacknowledgeFault).toHaveBeenCalled())

    rerender(<FaultAcknowledgeControl venueId={OTHER_ID} />)
    fireEvent.change(await screen.findByLabelText(COPY.reasonLabel), {
      target: { value: 'Expected.' },
    })
    // The unacknowledged panel renders exactly one button, so this finds it
    // whichever label it is wearing.
    const confirm = screen.getByRole('button')
    expect(confirm.textContent).toContain(COPY.confirm)
    expect(confirm.hasAttribute('disabled')).toBe(false)
  })
})
