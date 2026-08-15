// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { VenueExpectedBadge } from './VenueExpectedBadge'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { stubMatchMedia } from '@/test-utils/match-media'
import type {
  AcknowledgedFault,
  TriageFault,
} from '@/components/admin/triage/definitions/types'

const mockFetchVenueFault = vi.hoisted(() => vi.fn())
// A fresh getToken identity per render is a re-fetch loop when it sits in the
// effect deps, so the mock hands back one stable reference.
const getToken = vi.hoisted(() => vi.fn(() => Promise.resolve('token')))

const isLoaded = vi.hoisted(() => ({ current: true }))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, isLoaded: isLoaded.current }),
}))
vi.mock(
  '@/components/admin/fault-acknowledge-control/lib/acknowledgements',
  () => ({ fetchVenueFault: mockFetchVenueFault }),
)

const COPY = ADMIN_COPY.faultAcknowledge
const CEILING_LABEL = ADMIN_COPY.triage.conditions.ceiling.label

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const REASON = 'Live Nation caps the list at 36.'

const ceilingFault: TriageFault = {
  id: 'f-summit',
  venueId: VENUE_ID,
  venue: 'Summit',
  band: 'suspect',
  persistedSince: '2026-08-08T09:00:00.000Z',
  days: 6,
  dur: '6d',
  crawlRunId: 'run-1',
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
    reason: REASON,
    acknowledgedBy: 'user_admin_1',
    acknowledgedAt: '2026-08-14T05:00:00.000Z',
  },
}

describe('VenueExpectedBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getToken.mockResolvedValue('token')
    isLoaded.current = true
    stubMatchMedia(false)
  })

  it('waits for Clerk rather than reading a pre-hydration null token', async () => {
    // A null token before Clerk hydrates is transient. Treating it as "no
    // badge" strands the component for the whole session, because nothing
    // else in the effect deps changes when auth arrives.
    isLoaded.current = false
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })

    const { rerender } = render(<VenueExpectedBadge venueId={VENUE_ID} />)
    // The read is behind an awaited getToken, so an absence assertion here
    // passes vacuously unless the pending microtasks are flushed first.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(mockFetchVenueFault).not.toHaveBeenCalled()

    isLoaded.current = true
    rerender(<VenueExpectedBadge venueId={VENUE_ID} />)

    expect(await screen.findByText(COPY.badge)).toBeTruthy()
  })

  it('reads as a chip, keeping the reason out of the header row', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })

    render(<VenueExpectedBadge venueId={VENUE_ID} />)

    expect(await screen.findByText(COPY.badge)).toBeTruthy()
    // The inline reason is what wrapped the header onto three lines.
    expect(screen.queryByText(REASON)).toBeNull()
  })

  it('explains the condition and the reason in a tip', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })

    render(<VenueExpectedBadge venueId={VENUE_ID} />)

    const trigger = await screen.findByRole('button', { name: COPY.badge })
    fireEvent.click(trigger)

    expect(screen.getByText(CEILING_LABEL)).toBeTruthy()
    expect(screen.getByText(COPY.badgeTipBody(REASON))).toBeTruthy()
  })

  it('renders nothing when the venue has no acknowledgement', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged: null })

    const { container } = render(<VenueExpectedBadge venueId={VENUE_ID} />)

    await waitFor(() => expect(mockFetchVenueFault).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('stays silent when the read fails — it is a hint, not the page', async () => {
    mockFetchVenueFault.mockRejectedValue(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(<VenueExpectedBadge venueId={VENUE_ID} />)

    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    expect(container.textContent).toBe('')
    consoleError.mockRestore()
  })
})
