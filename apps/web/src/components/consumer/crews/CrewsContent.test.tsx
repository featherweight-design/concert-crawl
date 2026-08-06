// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { CrewSummary, PlanState } from '@concert-crawl/types'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const entitlement = {
  isLoading: false,
  active: true,
  surface: 'visible-active',
}
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}))
const planQuery: { data: PlanState | undefined } = { data: undefined }
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => planQuery,
}))
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))
vi.mock('./CreateCrewSheet', () => ({
  CreateCrewSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-sheet" /> : null,
}))

import { CrewsContent } from './CrewsContent'
import { CREWS_COPY } from './definitions/copy'

afterEach(cleanup)

beforeEach(() => {
  refresh.mockClear()
  entitlement.isLoading = false
  entitlement.active = true
  entitlement.surface = 'visible-active'
  planQuery.data = undefined
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const crew = (over: Partial<CrewSummary> = {}): CrewSummary => ({
  id: 'c1',
  name: 'Thursdays',
  patchSalt: 0,
  memberCount: 3,
  members: [{ userId: 'u1', handle: 'ana', avatarColor: null }],
  upcomingCount: 2,
  isKeeper: true,
  muted: false,
  ...over,
})

describe('CrewsContent states (#1226)', () => {
  it('renders a row per crew in the ready state', () => {
    render(
      <CrewsContent
        initialCrews={[crew(), crew({ id: 'c2', name: 'Fridays' })]}
        scaRegion={false}
      />,
    )
    expect(screen.getByText('Thursdays')).toBeInTheDocument()
    expect(screen.getByText('Fridays')).toBeInTheDocument()
    expect(screen.queryByText(CREWS_COPY.empty.title)).not.toBeInTheDocument()
  })

  it('shows the empty state and a gated create affordance when there are none', () => {
    render(<CrewsContent initialCrews={[]} scaRegion={false} />)
    expect(screen.getByText(CREWS_COPY.empty.title)).toBeInTheDocument()
    // One in the header, one under the empty state, and both are the same
    // gated component (Z7) rather than two separately-gated buttons.
    expect(screen.getAllByText(CREWS_COPY.list.create)).toHaveLength(2)
  })

  it('paints the error state with a real retry button and no create control', () => {
    render(<CrewsContent initialCrews={null} scaRegion={false} />)
    const retry = screen.getByRole('button', { name: CREWS_COPY.net.retry })
    expect(retry.tagName).toBe('BUTTON')
    expect(screen.queryByText(CREWS_COPY.list.create)).not.toBeInTheDocument()
    fireEvent.click(retry)
    expect(refresh).toHaveBeenCalled()
  })

  it('announces the loading state and hides the create control', () => {
    render(<CrewsContent initialCrews={[]} scaRegion={false} loading />)
    expect(screen.getByText(CREWS_COPY.net.loading)).toBeInTheDocument()
    expect(screen.queryByText(CREWS_COPY.list.create)).not.toBeInTheDocument()
  })
})

describe('CrewsContent create gating (#1226)', () => {
  it('opens the create sheet directly when the feature is active', () => {
    render(<CrewsContent initialCrews={[crew()]} scaRegion={false} />)
    fireEvent.click(screen.getByText(CREWS_COPY.list.create))
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument()
  })

  it('opens the gate instead when the feature is not active', () => {
    entitlement.active = false
    entitlement.surface = 'paywall'
    render(<CrewsContent initialCrews={[crew()]} scaRegion={false} />)
    fireEvent.click(screen.getByText(CREWS_COPY.list.create))
    expect(screen.getByText(CREWS_COPY.gate.title)).toBeInTheDocument()
    expect(screen.queryByTestId('create-sheet')).not.toBeInTheDocument()
  })

  it('routes tier-picker-on-tap straight to the picker', () => {
    entitlement.active = false
    entitlement.surface = 'tier-picker-on-tap'
    render(<CrewsContent initialCrews={[crew()]} scaRegion={false} />)
    fireEvent.click(screen.getByText(CREWS_COPY.list.create))
    const picker = screen.getByTestId('tier-picker')
    expect(picker.dataset.entry).toBe('logged-out-paywall')
  })
})

describe('CrewsContent lapsed-plan copy (#1226)', () => {
  // `status` is null until a subscription row has ever existed. Keying the
  // lapsed line off `plan === 'free'` instead told every first-time viewer
  // that starting a crew needs the tier "again".
  const plan = (status: PlanState['status']): PlanState => ({
    plan: 'free',
    onTrial: false,
    trialEndsAt: null,
    status,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    roleComped: false,
  })

  const openGate = () => {
    entitlement.active = false
    entitlement.surface = 'paywall'
    render(<CrewsContent initialCrews={[crew()]} scaRegion={false} />)
    fireEvent.click(screen.getByText(CREWS_COPY.list.create))
  }

  it('omits the lapsed line for someone who never subscribed', () => {
    planQuery.data = plan(null)
    openGate()
    expect(screen.getByText(CREWS_COPY.gate.title)).toBeInTheDocument()
    expect(screen.queryByText(/needs .* again/)).not.toBeInTheDocument()
  })

  it('shows the lapsed line once a subscription has existed', () => {
    planQuery.data = plan('canceled')
    openGate()
    expect(screen.getByText(/needs .* again/)).toBeInTheDocument()
  })
})
