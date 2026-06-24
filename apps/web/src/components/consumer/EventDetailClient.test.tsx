// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import type {
  EventDetailResponse,
  TierPriceBlock,
  Tier,
} from '@concert-crawl/types'

// ── Mocks ──────────────────────────────────────────────────────────────
const mockGetToken = vi.fn().mockResolvedValue('test-token')
const mockRouterRefresh = vi.fn()
const mockRouterPush = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}))
// PriceDisplay is server-leaning + has its own deep tree; stub it.
vi.mock('@/components/consumer/PriceDisplay', () => ({
  PriceDisplay: () => <div data-testid="price-display-stub" />,
}))
// SubmitPriceModal would mount + fetch on render; stub it so we can
// drive onSuccess directly from the test surface when needed.
let latestModalOnSuccess:
  | ((result: {
      isEdit: boolean
      id: string
      priceMin: string
      priceMax: string | null
      tier: string
      vendor: string
      howFound: string
      sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
    }) => void)
  | null = null
// CorroborationSheet renders a portal-mounted modal; stub it so we can
// detect open=true purely from the rendered DOM without dragging in the
// real sheet's tree.
vi.mock('@/components/consumer/CorroborationSheet', () => ({
  CorroborationSheet: (props: { open: boolean }) =>
    props.open ? <div data-testid="corroboration-sheet-open" /> : null,
}))
vi.mock('@/components/consumer/submit-price/SubmitPriceModal', () => ({
  SubmitPriceModal: (props: {
    open: boolean
    onSuccess?: (result: {
      isEdit: boolean
      id: string
      priceMin: string
      priceMax: string | null
      tier: string
      vendor: string
      howFound: string
      sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
    }) => void
  }) => {
    latestModalOnSuccess = props.onSuccess ?? null
    return props.open ? <div data-testid="submit-price-modal-open" /> : null
  },
}))

beforeEach(() => {
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
  vi.clearAllMocks()
  latestModalOnSuccess = null
})

afterEach(() => {
  cleanup()
})

// Imported after mocks so vi.mock takes effect.
import { EventDetailPriceBlock } from './EventDetailClient'

// ── Helpers ───────────────────────────────────────────────────────────

function buildBaseEvent(
  overrides: Partial<EventDetailResponse> = {},
): EventDetailResponse {
  return {
    id: 'evt-1',
    venueId: 'venue-1',
    title: 'Test Show',
    artist: 'Test Artist',
    date: '2099-07-15',
    doorsTime: null,
    showTime: null,
    ticketUrl: null,
    ticketLinks: null,
    ticketPriceMin: null,
    ticketPriceMax: null,
    priceSource: null,
    pipelineExhaustedAt: null,
    description: null,
    imageUrl: null,
    genre: null,
    status: 'upcoming',
    confidenceScore: null,
    verified: true,
    sourceUrl: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    venue: {
      id: 'venue-1',
      name: 'Test Venue',
      slug: 'test-venue',
      city: 'Denver',
      websiteUrl: 'https://example.com',
      timezone: 'America/Denver',
    },
    setlist: null,
    watching: 0,
    isWatching: false,
    pendingSubmissions: null,
    priceByTier: null,
    soldOutReport: null,
    counterSubmission: null,
    priceAlternates: null,
    ...overrides,
  }
}

function makeTierBlock(partial: Partial<TierPriceBlock>): TierPriceBlock {
  return {
    tier: 'GA',
    headline: null,
    alternates: [],
    pending: [],
    counterSubmission: null,
    reports: 0,
    ...partial,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('EventDetailPriceBlock — new decision-tree branches', () => {
  it('sold-out + resale ticketLink → renders FaceValueCard + resale ProvenanceCTA', () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: [
        {
          kind: 'resale',
          vendor: 'SeatGeek',
          url: 'https://seatgeek.example/event',
        },
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )

    // SoldOutPriceCard (has-listing variant) — strikethrough is rendered as
    // an em-dash when priceMin is null; either way the Sold out pill is present.
    expect(screen.getByText('Sold out')).toBeDefined()
    // FaceValueCard variant='default' → "That's resale — not face value."
    expect(screen.getByText("That's resale — not face value.")).toBeDefined()
    // ProvenanceCTA kind='resale' → "See resale tickets"
    expect(
      screen.getByRole('link', { name: /buy resale on seatgeek/i }),
    ).toBeDefined()
  })

  it('sold-out + NO ticketLinks → ContributeFaceValueCard, NO FaceValueCard, NO ProvenanceCTA (Q1 lock)', () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: null,
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )

    // SoldOutPriceCard variant='no-listing'
    expect(screen.getByText('—')).toBeDefined()
    expect(
      screen.getByText(
        'No tickets listed anywhere we can see — not even resale.',
      ),
    ).toBeDefined()
    // ContributeFaceValueCard — eyebrow "Face value" + headline "No price to show — yet."
    expect(screen.getByText('No price to show — yet.')).toBeDefined()
    expect(
      screen.getByText(
        'Sold out, nothing listed. Know the box-office number? Add it.',
      ),
    ).toBeDefined()
    // NO FaceValueCard headlines
    expect(screen.queryByText("That's resale — not face value.")).toBeNull()
    expect(screen.queryByText('All we can see is resale.')).toBeNull()
    // NO ProvenanceCTA link
    expect(screen.queryByRole('link', { name: /resale/i })).toBeNull()
  })

  it('priceByTier with cross-source mixed entry tier → MultiSourceMultiTierCard', () => {
    const event = buildBaseEvent({
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: {
            submissionId: 's1',
            priceMin: '25',
            priceMax: null,
            vendor: 'VenueBoxOffice',
            sourceCategory: 'boxoffice',
            submitterHandle: 'ada',
            observedAt: '2026-06-20T00:00:00Z',
            approvedAt: '2026-06-20T00:00:00Z',
            approvalKind: 'fan',
            confirmsCount: 2,
          },
          alternates: [
            {
              submissionId: 'a1',
              priceMin: '110',
              priceMax: null,
              vendor: 'SeatGeek',
              sourceCategory: 'resale',
            },
          ],
        }),
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // MultiSourceMultiTierCard renders the cross-source row via AltSourceRow.
    // The "Or pay for convenience" eyebrow uniquely identifies this card.
    expect(screen.getByText('Or pay for convenience')).toBeDefined()
    // Cross-source vendor + price visible.
    expect(screen.getByText('SeatGeek')).toBeDefined()
    expect(screen.getByText('$110')).toBeDefined()
  })

  it('priceByTier with single-tier boxoffice headline → MultiTierLiveCard kind=boxoffice', () => {
    const event = buildBaseEvent({
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: {
            submissionId: 's1',
            priceMin: '25',
            priceMax: null,
            vendor: 'VenueBoxOffice',
            sourceCategory: 'boxoffice',
            submitterHandle: 'ada',
            observedAt: '2026-06-20T00:00:00Z',
            approvedAt: '2026-06-20T00:00:00Z',
            approvalKind: 'fan',
            confirmsCount: 2,
          },
        }),
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // Box office trust pill visible.
    expect(screen.getByText('Box office')).toBeDefined()
    expect(screen.getByText('$25')).toBeDefined()
  })

  it('priceByTier with resale-only headlines → MultiTierLiveCard kind=resale + FaceValueCard', () => {
    const event = buildBaseEvent({
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: {
            submissionId: 's1',
            priceMin: '110',
            priceMax: null,
            vendor: 'SeatGeek',
            sourceCategory: 'resale',
            submitterHandle: 'ada',
            observedAt: '2026-06-20T00:00:00Z',
            approvedAt: '2026-06-20T00:00:00Z',
            approvalKind: 'fan',
            confirmsCount: 2,
          },
        }),
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // PendingTrustPill kind=resale renders "Resale" alongside FaceValueCard's
    // "Resale" ladder label, so allow the multiplicity here.
    expect(screen.getAllByText('Resale').length).toBeGreaterThan(0)
    // FaceValueCard variant='no-price' → "All we can see is resale."
    expect(screen.getByText('All we can see is resale.')).toBeDefined()
    // Confirm the trust pill is in fact the coral resale pill (Q-resale path).
    const resaleEls = screen.getAllByText('Resale')
    const pill = resaleEls.find((el) =>
      (el as HTMLElement).style.background.includes('oklch(0.65 0.2 25)'),
    )
    expect(pill).toBeDefined()
  })

  it('STATE #6 mixed-tier — headline tier + pending-only tier routes through MixedTierCard', () => {
    const headlineBlock = makeTierBlock({
      tier: 'GA',
      headline: {
        submissionId: 's1',
        priceMin: '25',
        priceMax: null,
        vendor: 'VenueBoxOffice',
        sourceCategory: 'boxoffice',
        submitterHandle: 'ada',
        observedAt: '2026-06-20T00:00:00Z',
        approvedAt: '2026-06-20T00:00:00Z',
        approvalKind: 'fan',
        confirmsCount: 2,
      },
    })
    const pendingOnlyBlock = makeTierBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'p-vip',
          priceMin: '80',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 1,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const event = buildBaseEvent({
      priceByTier: [headlineBlock, pendingOnlyBlock],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // Headline tier renders.
    expect(screen.getByText('$25')).toBeDefined()
    // Pending-only tier renders its price + the shipped per-tier pending tell
    // via TierAlternateRow ("pending · 1/2").
    expect(screen.getByText('$80')).toBeDefined()
    // VIP shows up as alternate tier label.
    expect(screen.getByText('VIP')).toBeDefined()
  })

  it('STATE #7 all-tiers-pending — every tier is pending-only routes through TwoPendingStack', () => {
    const ga = makeTierBlock({
      tier: 'GA',
      headline: null,
      pending: [
        {
          id: 'p-ga',
          priceMin: '40',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const vip = makeTierBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'p-vip',
          priceMin: '95',
          priceMax: null,
          vendor: 'Ticketmaster',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'kim',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const event = buildBaseEvent({ priceByTier: [ga, vip] })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // Both pending cards render side-by-side.
    expect(screen.getByText('$40')).toBeDefined()
    expect(screen.getByText('$95')).toBeDefined()
  })

  it('submit success in sold-out-resale branch → MTAddTierSuccess renders (Fix 4 — hoisted surface)', async () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: [
        {
          kind: 'resale',
          vendor: 'SeatGeek',
          url: 'https://seatgeek.example/event',
        },
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    expect(latestModalOnSuccess).not.toBeNull()
    await act(async () => {
      latestModalOnSuccess?.({
        isEdit: false,
        id: 'sub-ga-1',
        priceMin: '40',
        priceMax: null,
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'bought_myself',
        sourceCategory: 'boxoffice',
      })
    })
    // MTAddTierSuccess headline copy template is `${tier} price is in. Thanks.`
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined()
  })

  it('submit success in sold-out-contribute branch → MTAddTierSuccess renders', async () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: null,
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    expect(latestModalOnSuccess).not.toBeNull()
    await act(async () => {
      latestModalOnSuccess?.({
        isEdit: false,
        id: 'sub-ga-1',
        priceMin: '40',
        priceMax: null,
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'bought_myself',
        sourceCategory: 'boxoffice',
      })
    })
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined()
  })

  it('submit success in resale-headline branch → MTAddTierSuccess renders', async () => {
    const event = buildBaseEvent({
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: {
            submissionId: 's1',
            priceMin: '110',
            priceMax: null,
            vendor: 'SeatGeek',
            sourceCategory: 'resale',
            submitterHandle: 'ada',
            observedAt: '2026-06-20T00:00:00Z',
            approvedAt: '2026-06-20T00:00:00Z',
            approvalKind: 'fan',
            confirmsCount: 2,
          },
        }),
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    expect(latestModalOnSuccess).not.toBeNull()
    await act(async () => {
      latestModalOnSuccess?.({
        isEdit: false,
        id: 'sub-vip-1',
        priceMin: '40',
        priceMax: null,
        tier: 'VIP',
        vendor: 'VenueBoxOffice',
        howFound: 'bought_myself',
        sourceCategory: 'boxoffice',
      })
    })
    expect(screen.getByText('VIP price is in. Thanks.')).toBeDefined()
  })

  it('submit success: after onAddTier("VIP"), VIP pill removed on next render (Q4-eng lock)', async () => {
    const event = buildBaseEvent({
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: {
            submissionId: 's1',
            priceMin: '25',
            priceMax: null,
            vendor: 'VenueBoxOffice',
            sourceCategory: 'boxoffice',
            submitterHandle: 'ada',
            observedAt: '2026-06-20T00:00:00Z',
            approvedAt: '2026-06-20T00:00:00Z',
            approvalKind: 'fan',
            confirmsCount: 2,
          },
        }),
      ],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )

    // Drive a submit success via the stubbed modal's captured onSuccess.
    expect(latestModalOnSuccess).not.toBeNull()
    await act(async () => {
      latestModalOnSuccess?.({
        isEdit: false,
        id: 'sub-vip-1',
        priceMin: '120',
        priceMax: null,
        tier: 'VIP',
        vendor: 'Ticketmaster',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
      })
    })

    // MTAddTierSuccess should render with "VIP" submitted.
    // Headline copy template is `${tier} price is in. Thanks.`
    expect(screen.getByText('VIP price is in. Thanks.')).toBeDefined()

    // Add-pill row should exclude VIP — only show the other four tiers.
    const remainingTiers: Tier[] = ['GA', 'Reserved', 'Pit', 'Lawn']
    for (const tier of remainingTiers) {
      // addPillTemplate = "+ Add <lowercase-tier>"
      const pillCopy = `Add ${tier.toLowerCase()}`
      expect(screen.queryByText(new RegExp(pillCopy, 'i'))).not.toBeNull()
    }
    // VIP pill must NOT appear.
    expect(screen.queryByText(/Add vip/i)).toBeNull()
  })

  it('STATE #7 all-tiers-pending: clicking Confirm on a non-submitter card opens the CorroborationSheet', () => {
    const ga = makeTierBlock({
      tier: 'GA',
      headline: null,
      pending: [
        {
          id: 'p-ga',
          priceMin: '40',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    const event = buildBaseEvent({ priceByTier: [ga] })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // Sheet not open before click.
    expect(screen.queryByTestId('corroboration-sheet-open')).toBeNull()
    // PendingCardB renders the "Confirm price" affordance for view='other'.
    const confirmBtn = screen.getByText('Confirm price')
    act(() => {
      fireEvent.click(confirmBtn)
    })
    // onConfirm wired to setActiveCorroborationId → sheet now mounted.
    expect(screen.getByTestId('corroboration-sheet-open')).toBeDefined()
  })

  it('STATE #7 all-tiers-pending: clicking Withdraw on the submitter card DELETEs the submission + refreshes router', async () => {
    const ga = makeTierBlock({
      tier: 'GA',
      headline: null,
      pending: [
        {
          id: 'p-ga',
          priceMin: '40',
          priceMax: null,
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          note: null,
          submitterHandle: 'me',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: true,
        },
      ],
    })
    const event = buildBaseEvent({ priceByTier: [ga] })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // view='submitter' → "Withdraw" button is rendered alongside "Edit".
    const withdrawBtn = screen.getByText('Withdraw')
    await act(async () => {
      fireEvent.click(withdrawBtn)
    })
    // Allow the void-async IIFE to resolve.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? []
    expect(String(calledUrl)).toContain('/v1/submissions/p-ga')
    expect((calledInit as RequestInit | undefined)?.method).toBe('DELETE')
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
    fetchMock.mockRestore()
  })
})
