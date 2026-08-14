// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { VenueExpectedBadge } from './VenueExpectedBadge'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
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

const EXPECTED_TITLE = ADMIN_COPY.faultAcknowledge.acknowledgedTitle
const CEILING_LABEL = ADMIN_COPY.triage.conditions.ceiling.label

const VENUE_ID = '11111111-1111-1111-1111-111111111111'

const ceilingFault: TriageFault = {
  id: 'f-summit',
  venueId: VENUE_ID,
  venue: 'Summit',
  band: 'suspect',
  persistedSince: '2026-08-08T09:00:00.000Z',
  days: 6,
  dur: '6d',
  // Non-null so the row resolves to the inspector rather than degrading to
  // the venue page — which, read from the venue page, is a self-link.
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
    reason: 'Live Nation caps the list at 36.',
    acknowledgedBy: 'user_admin_1',
    acknowledgedAt: '2026-08-14T05:00:00.000Z',
  },
}

describe('VenueExpectedBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getToken.mockResolvedValue('token')
    isLoaded.current = true
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

    expect(
      await screen.findByText(new RegExp(EXPECTED_TITLE, 'i')),
    ).toBeTruthy()
  })

  it('names the acknowledged condition and why it is expected', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })

    render(<VenueExpectedBadge venueId={VENUE_ID} />)

    expect(
      await screen.findByText(new RegExp(EXPECTED_TITLE, 'i')),
    ).toBeTruthy()
    expect(screen.getByText(new RegExp(CEILING_LABEL, 'i'))).toBeTruthy()
    expect(screen.getByText('Live Nation caps the list at 36.')).toBeTruthy()
  })

  it('links to the inspector, where the acknowledgement can be undone', async () => {
    mockFetchVenueFault.mockResolvedValue({ fault: null, acknowledged })

    render(<VenueExpectedBadge venueId={VENUE_ID} />)

    const link = await screen.findByRole('link')
    expect(link.getAttribute('href')).toBe(
      `/admin/crawl?venueId=${VENUE_ID}&tab=history`,
    )
  })

  it('still links to the inspector when the fault has no run', async () => {
    // `faultHref` degrades to the venue page without a run, which from the
    // venue page is a link to itself.
    mockFetchVenueFault.mockResolvedValue({
      fault: null,
      acknowledged: { ...acknowledged, crawlRunId: null },
    })

    render(<VenueExpectedBadge venueId={VENUE_ID} />)

    const link = await screen.findByRole('link')
    expect(link.getAttribute('href')).toBe(
      `/admin/crawl?venueId=${VENUE_ID}&tab=history`,
    )
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
