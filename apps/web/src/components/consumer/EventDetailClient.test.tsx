// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import type {
  EventDetailResponse,
  TierHeadline,
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
// Shape mirrors SubmitPriceResult exported from SubmitPriceModal (#832).
interface ModalSuccessRow {
  isEdit: boolean
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
}
let latestModalOnSuccess: ((results: ModalSuccessRow[]) => void) | null = null
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
    onSuccess?: (results: ModalSuccessRow[]) => void
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
    venueGuidePublished: false,
    title: 'Test Show',
    artist: 'Test Artist',
    supportingArtists: null,
    artistSlug: null,
    supportingArtistSlugs: null,
    tourName: null,
    date: '2099-07-15',
    doorsTime: null,
    showTime: null,
    ticketUrl: null,
    eventUrl: null,
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
    attendingAt: null,
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

  // Regression — issue #1364. Once an event has a corroborated price it
  // routes to one of these headline branches, all of which mounted a
  // SubmitPriceModal but rendered no control to open it. The practical
  // symptom: the FIRST price submission works, and every later user who
  // knows a cheaper price is stuck with no affordance at all.
  describe('persistent submit-price CTA on headline branches (#1364)', () => {
    const boxOfficeHeadline: TierHeadline = {
      submissionId: 's1',
      priceMin: '25',
      priceMax: null,
      vendor: 'VenueBoxOffice',
      sourceCategory: 'boxoffice' as const,
      submitterHandle: 'ada',
      observedAt: '2026-06-20T00:00:00Z',
      approvedAt: '2026-06-20T00:00:00Z',
      approvalKind: 'fan' as const,
      confirmsCount: 2,
    }

    const renderWithTiers = (blocks: TierPriceBlock[]) =>
      render(
        <EventDetailPriceBlock
          event={buildBaseEvent({ priceByTier: blocks })}
          reports={[]}
          currentUserId={null}
        />,
      )

    it('multi-tier-shipped renders it', () => {
      renderWithTiers([
        makeTierBlock({ tier: 'GA', headline: boxOfficeHeadline }),
      ])
      expect(screen.getByText('Submit another price')).toBeDefined()
    })

    it('multi-source-mixed renders it', () => {
      renderWithTiers([
        makeTierBlock({
          tier: 'GA',
          headline: boxOfficeHeadline,
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
      ])
      expect(screen.getByText('Submit another price')).toBeDefined()
    })

    it('resale-headline renders it', () => {
      renderWithTiers([
        makeTierBlock({
          tier: 'GA',
          headline: {
            ...boxOfficeHeadline,
            vendor: 'SeatGeek',
            sourceCategory: 'resale',
          },
        }),
      ])
      expect(screen.getByText('Submit another price')).toBeDefined()
    })

    it('mixed-tier renders it', () => {
      renderWithTiers([
        makeTierBlock({ tier: 'GA', headline: boxOfficeHeadline }),
        makeTierBlock({
          tier: 'Reserved',
          headline: null,
          pending: [
            {
              id: 'p-res',
              priceMin: '60',
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
        }),
      ])
      expect(screen.getByText('Submit another price')).toBeDefined()
    })

    // Fix 14 predates this change and must survive it: a cancelled show
    // should never invite a price submission.
    it('is withheld for a cancelled event', () => {
      render(
        <EventDetailPriceBlock
          event={buildBaseEvent({
            status: 'cancelled',
            priceByTier: [
              makeTierBlock({ tier: 'GA', headline: boxOfficeHeadline }),
            ],
          })}
          reports={[]}
          currentUserId={null}
        />,
      )
      expect(screen.queryByText('Submit another price')).toBeNull()
    })
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

  // #1377 — the exact staging repro: a second user submits a cheaper GA price
  // on an event whose GA tier is ALREADY corroborated. No tier is pending-only,
  // so decidePriceRegion routes to multi-tier-shipped — the branch that used to
  // render only headlines, leaving the submission invisible and unconfirmable.
  it('pending on a tier that already has a headline renders the pending card + Confirm affordance (#1377)', () => {
    const ga = makeTierBlock({
      tier: 'GA',
      headline: {
        submissionId: 's1',
        priceMin: '240',
        priceMax: null,
        vendor: 'AXS',
        sourceCategory: 'standard',
        submitterHandle: 'ada',
        observedAt: '2026-06-20T00:00:00Z',
        approvedAt: '2026-06-20T00:00:00Z',
        approvalKind: 'fan',
        confirmsCount: 2,
      },
      pending: [
        {
          id: 'p-ga',
          priceMin: '220',
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
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga] })}
        reports={[]}
        currentUserId={null}
      />,
    )
    // The headline still leads.
    expect(screen.getByText(/240/)).toBeDefined()
    // The pending submission is visible rather than silently dropped.
    expect(screen.getByText(/220/)).toBeDefined()
    // And a third user can corroborate it.
    expect(screen.queryByTestId('corroboration-sheet-open')).toBeNull()
    act(() => {
      fireEvent.click(screen.getByText('Confirm price'))
    })
    expect(screen.getByTestId('corroboration-sheet-open')).toBeDefined()
  })

  it('separates the pending stack from the headline card above it', () => {
    const ga = makeTierBlock({
      tier: 'GA',
      headline: {
        submissionId: 's1',
        priceMin: '240',
        priceMax: null,
        vendor: 'AXS',
        sourceCategory: 'standard',
        submitterHandle: 'ada',
        observedAt: '2026-06-20T00:00:00Z',
        approvedAt: '2026-06-20T00:00:00Z',
        approvalKind: 'fan',
        confirmsCount: 2,
      },
      pending: [
        {
          id: 'p-ga',
          priceMin: '220',
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
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga] })}
        reports={[]}
        currentUserId={null}
      />,
    )
    // The stack sits in its own spaced wrapper rather than butting up against
    // the headline card. first:mt-0 keeps all-tiers-pending flush.
    const stack = screen.getByText(/220/).closest('.mt-3')
    expect(stack).not.toBeNull()
    expect(stack?.className).toContain('first:mt-0')
  })

  // Same class as #1377, caught by Copilot: in mixed-tier a pending-only tier
  // renders through TierAlternateRow, whose "pending · N/M" strip has no
  // button. Without a pending card alongside it the submission is just as
  // uncorroboratable as the headline-tier case above.
  it('pending-only tier in mixed-tier is confirmable, not just a display-only strip (#1377)', () => {
    const ga = makeTierBlock({
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
    const vip = makeTierBlock({
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
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    })
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga, vip] })}
        reports={[]}
        currentUserId={null}
      />,
    )
    expect(screen.queryByTestId('corroboration-sheet-open')).toBeNull()
    act(() => {
      fireEvent.click(screen.getByText('Confirm price'))
    })
    expect(screen.getByTestId('corroboration-sheet-open')).toBeDefined()
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
    // Pending-only tier renders its price twice: the display-only TierAlternateRow
    // tell ("pending · 1/2") and the actionable pending card below it.
    expect(screen.getAllByText('$80')).toHaveLength(2)
    // VIP shows up as alternate tier label, once per surface.
    expect(screen.getAllByText('VIP')).toHaveLength(2)
  })

  it('STATE #7 all-tiers-pending — every tier is pending-only routes through PendingStack', () => {
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
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-ga-1',
          priceMin: '40',
          priceMax: null,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
      ])
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
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-ga-1',
          priceMin: '40',
          priceMax: null,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
      ])
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
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-vip-1',
          priceMin: '40',
          priceMax: null,
          tier: 'VIP',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
      ])
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
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-vip-1',
          priceMin: '120',
          priceMax: null,
          tier: 'VIP',
          vendor: 'Ticketmaster',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
        },
      ])
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

  it('batch submit success with 2 tiers → success card shows first tier, both tiers excluded from add-pills (#832)', async () => {
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
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-ga-1',
          priceMin: '45',
          priceMax: null,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
        {
          isEdit: false,
          id: 'sub-vip-1',
          priceMin: '120',
          priceMax: '150',
          tier: 'VIP',
          vendor: 'VenueBoxOffice',
          howFound: 'bought_myself',
          sourceCategory: 'boxoffice',
        },
      ])
    })
    // MTAddTierSuccess headline reflects the FIRST submitted tier.
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined()
    // Both submitted tiers are locked out of the add-pill row...
    expect(screen.queryByText(/Add ga/i)).toBeNull()
    expect(screen.queryByText(/Add vip/i)).toBeNull()
    // ...while an unsubmitted tier still offers a pill.
    expect(screen.queryByText(/Add reserved/i)).not.toBeNull()
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

  // Regression — issue #831. The submitter counts as observation #1 in the
  // 1/2 corroboration model (price_submissions.corroboration_count defaults
  // to 1 — see migration 0040). The API surfaces `confirmsCount` as
  // non-submitter confirms (excludes the submitter), so the UI must add +1
  // before rendering "X of Y confirmed" or the strip lies "0 of 2" the
  // moment after a user submits.
  it('STATE #7 all-tiers-pending: pending submission with confirmsCount=0 renders "1 of 2 confirmed" (submitter counts as #1, #831)', () => {
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
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // The strip header reads "{confirms} of {needed} confirmed". Submitter
    // counts as observation #1 → must read "1 of 2" not "0 of 2".
    expect(screen.getByText(/1\s+of\s+2\s+confirmed/i)).toBeDefined()
    expect(screen.queryByText(/0\s+of\s+2\s+confirmed/i)).toBeNull()
  })

  // Regression — issue #895 symptom 1. A pending price block must offer a
  // reload-surviving "submit another price" affordance. The post-submit
  // MTAddTierSuccess surface is session-only (cleared on refresh), so the
  // persistent SubmitPriceCardCta ("Submit another price") has to render
  // in the pending paths too — otherwise a user who reloads after batch
  // submitting has no way to add another tier.
  it('STATE #7 all-tiers-pending: renders the persistent SubmitPriceCardCta (#895 symptom 1)', () => {
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
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    expect(screen.getByText('Submit another price')).toBeDefined()
  })

  it('legacy pending (pendingSubmissions) path renders the persistent SubmitPriceCardCta (#895 symptom 1)', () => {
    const event = buildBaseEvent({
      priceByTier: null,
      pendingSubmissions: [
        {
          id: 'p-legacy',
          priceMin: '40',
          priceMax: null,
          tier: 'General Admission',
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
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    expect(screen.getByText('Submit another price')).toBeDefined()
  })

  // Regression — issue #895 (post-submit form re-open). Submitting from the
  // no-price branch populates localSubmissions, which flips the decision tree
  // to the legacy pending branch (4a) and remounts the SubmitPriceModal. The
  // remounted modal loses its internal success state and re-renders the form.
  // The fix lifts the success payload to the parent (submitSuccessSurface) via
  // onPendingSubmitSuccess, so the success card survives the branch switch
  // instead of the form re-appearing.
  it('no-price branch: submit success shows the success surface after the pending-branch transition (#895)', async () => {
    const event = buildBaseEvent({
      ticketPriceMin: null,
      pendingSubmissions: null,
      priceByTier: null,
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )

    expect(latestModalOnSuccess).not.toBeNull()
    await act(async () => {
      latestModalOnSuccess?.([
        {
          isEdit: false,
          id: 'sub-ga-1',
          priceMin: '40',
          priceMax: null,
          tier: 'GA',
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
        },
      ])
    })

    // Parent-owned success surface renders even though the block transitioned
    // into the legacy pending branch — the form did not re-open.
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined()
    expect(screen.queryByTestId('submit-price-modal-open')).toBeNull()
  })

  // Regression — issue #831. Same bug in the mixed-tier branch (a pending-only
  // sibling tier renders via TierAlternateRow's "pending · {N}/{needed}" tell).
  it('mixed-tier: pending-only sibling tier renders "pending · 1/2" not "pending · 0/2" (submitter counts as #1, #831)', () => {
    const headlineBlock = makeTierBlock({
      tier: 'GA',
      headline: {
        submissionId: 's1',
        priceMin: '25',
        priceMax: null,
        vendor: 'VenueBoxOffice',
        sourceCategory: 'boxoffice',
        submitterHandle: 'alex',
        observedAt: '2026-06-21T00:00:00Z',
        approvedAt: '2026-06-21T01:00:00Z',
        approvalKind: 'fan',
        confirmsCount: 1,
      },
      alternates: [],
      pending: [],
    })
    const pendingOnlyBlock = makeTierBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'p-vip',
          priceMin: '90',
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
    const event = buildBaseEvent({
      priceByTier: [headlineBlock, pendingOnlyBlock],
    })
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    )
    // TierAlternateRow renders "pending · {confirms}/{needed}".
    expect(screen.getByText(/pending · 1\/2/i)).toBeDefined()
    expect(screen.queryByText(/pending · 0\/2/i)).toBeNull()
  })
})
