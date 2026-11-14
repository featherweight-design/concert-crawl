// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitFor,
  within,
} from '@testing-library/react';
import type {
  EventDetailResponse,
  EventReport,
  TierCounter,
  TierHeadline,
  TierPriceBlock,
  Tier,
} from '@concert-crawl/types';

// ── Mocks ──────────────────────────────────────────────────────────────
const mockGetToken = vi.fn().mockResolvedValue('test-token');
const mockRouterRefresh = vi.fn();
const mockRouterPush = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}));
// PriceDisplay is server-leaning + has its own deep tree; stub it. The stub
// records its props so the stale-price wiring can be asserted without
// rendering the real tree.
interface PriceDisplayStubProps {
  priceObservedAt?: string | null;
  priceSubmissionId?: string | null;
  onSighted?: () => void;
}
let latestPriceDisplayProps: PriceDisplayStubProps | null = null;
vi.mock('@/components/consumer/PriceDisplay', () => ({
  PriceDisplay: (props: PriceDisplayStubProps) => {
    latestPriceDisplayProps = props;
    return <div data-testid="price-display-stub" />;
  },
}));
// SubmitPriceModal would mount + fetch on render; stub it so we can
// drive onSuccess directly from the test surface when needed.
// Shape mirrors SubmitPriceResult exported from SubmitPriceModal (#832).
interface ModalSuccessRow {
  isEdit: boolean;
  id: string;
  priceMin: string;
  priceMax: string | null;
  tier: string;
  vendor: string;
  howFound: string;
  sourceCategory: 'boxoffice' | 'standard' | 'resale' | null;
}
let latestModalOnSuccess: ((results: ModalSuccessRow[]) => void) | null = null;
// CorroborationSheet renders a portal-mounted modal; stub it so we can
// detect open=true purely from the rendered DOM without dragging in the
// real sheet's tree.
vi.mock('@/components/consumer/CorroborationSheet', () => ({
  CorroborationSheet: (props: {
    open: boolean;
    submission: { kind: string };
  }) =>
    props.open ? (
      <div
        data-testid="corroboration-sheet-open"
        data-kind={props.submission.kind}
      />
    ) : null,
}));
vi.mock('@/components/consumer/submit-price/SubmitPriceModal', () => ({
  SubmitPriceModal: (props: {
    open: boolean;
    onSuccess?: (results: ModalSuccessRow[]) => void;
  }) => {
    latestModalOnSuccess = props.onSuccess ?? null;
    return props.open ? <div data-testid="submit-price-modal-open" /> : null;
  },
}));

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
  });
  vi.clearAllMocks();
  latestModalOnSuccess = null;
  latestPriceDisplayProps = null;
});

afterEach(() => {
  cleanup();
});

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { REPORTING_COPY } from '@/components/consumer/reporting/definitions/copy';

// Imported after mocks so vi.mock takes effect.
import {
  EventDetailBanners,
  EventDetailFooter,
  EventDetailPriceBlock,
} from './EventDetailClient';

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
    watching: 0,
    isWatching: false,
    attendingAt: null,
    pendingSubmissions: null,
    priceByTier: null,
    soldOutReport: null,
    counterSubmission: null,
    priceAlternates: null,
    ...overrides,
  };
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
  };
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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );

    // SoldOutPriceCard (has-listing variant) — strikethrough is rendered as
    // an em-dash when priceMin is null; either way the Sold out pill is present.
    expect(screen.getByText('Sold out')).toBeDefined();
    // FaceValueCard variant='default' → "That's resale, not face value."
    expect(screen.getByText("That's resale, not face value.")).toBeDefined();
    // ProvenanceCTA kind='resale' → "See resale tickets"
    expect(
      screen.getByRole('link', { name: /buy resale on seatgeek/i }),
    ).toBeDefined();
  });

  it('sold-out + NO ticketLinks → ContributeFaceValueCard, NO FaceValueCard, NO ProvenanceCTA (Q1 lock)', () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: null,
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );

    // SoldOutPriceCard variant='no-listing'
    expect(screen.getByText('—')).toBeDefined();
    expect(
      screen.getByText(
        'No tickets listed anywhere we can see. Not even resale.',
      ),
    ).toBeDefined();
    // ContributeFaceValueCard — eyebrow "Face value" + headline "No price to show. Yet."
    expect(screen.getByText('No price to show. Yet.')).toBeDefined();
    expect(
      screen.getByText(
        'Sold out, nothing listed. Know the box-office number? Add it.',
      ),
    ).toBeDefined();
    // NO FaceValueCard headlines
    expect(screen.queryByText("That's resale, not face value.")).toBeNull();
    expect(screen.queryByText('All we can see is resale.')).toBeNull();
    // NO ProvenanceCTA link
    expect(screen.queryByRole('link', { name: /resale/i })).toBeNull();
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // MultiSourceMultiTierCard renders the cross-source row via AltSourceRow.
    // The "Or pay for convenience" eyebrow uniquely identifies this card.
    expect(screen.getByText('Or pay for convenience')).toBeDefined();
    // Cross-source vendor + price visible.
    expect(screen.getByText('SeatGeek')).toBeDefined();
    expect(screen.getByText('$110')).toBeDefined();
  });

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
    };

    const renderWithTiers = (blocks: TierPriceBlock[]) =>
      render(
        <EventDetailPriceBlock
          event={buildBaseEvent({ priceByTier: blocks })}
          reports={[]}
          currentUserId={null}
        />,
      );

    it('multi-tier-shipped renders it', () => {
      renderWithTiers([
        makeTierBlock({ tier: 'GA', headline: boxOfficeHeadline }),
      ]);
      expect(screen.getByText('Submit another price')).toBeDefined();
    });

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
      ]);
      expect(screen.getByText('Submit another price')).toBeDefined();
    });

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
      ]);
      expect(screen.getByText('Submit another price')).toBeDefined();
    });

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
      ]);
      expect(screen.getByText('Submit another price')).toBeDefined();
    });

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
      );
      expect(screen.queryByText('Submit another price')).toBeNull();
    });

    // No longer listed is stored as cancelled, but nobody confirmed it, so the
    // price surfaces keep inviting a submission (B+ A5, isCancelledForDetail).
    it('is offered for a No longer listed event', () => {
      render(
        <EventDetailPriceBlock
          event={buildBaseEvent({
            status: 'cancelled',
            delistedAt: '2026-11-04T10:00:00.000Z',
            priceByTier: [
              makeTierBlock({ tier: 'GA', headline: boxOfficeHeadline }),
            ],
          })}
          reports={[]}
          currentUserId={null}
        />,
      );
      expect(screen.getByText('Submit another price')).toBeDefined();
    });
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // Box office trust pill visible.
    expect(screen.getByText('Box office')).toBeDefined();
    expect(screen.getByText('$25')).toBeDefined();
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // PendingTrustPill kind=resale renders "Resale" alongside FaceValueCard's
    // "Resale" ladder label, so allow the multiplicity here.
    expect(screen.getAllByText('Resale').length).toBeGreaterThan(0);
    // FaceValueCard variant='no-price' → "All we can see is resale."
    expect(screen.getByText('All we can see is resale.')).toBeDefined();
    // Confirm the trust pill is the resale kind of the shared TrustPill
    // (addendum 4 item 5 replaced the old oklch pill tokens).
    expect(screen.getByTestId('trust-pill-resale').textContent).toBe('Resale');
  });

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
    });
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga] })}
        reports={[]}
        currentUserId={null}
      />,
    );
    // The headline still leads.
    expect(screen.getByText(/240/)).toBeDefined();
    // The pending submission is visible rather than silently dropped.
    expect(screen.getByText(/220/)).toBeDefined();
    // And a third user can corroborate it.
    expect(screen.queryByTestId('corroboration-sheet-open')).toBeNull();
    act(() => {
      fireEvent.click(screen.getByText('Confirm price'));
    });
    expect(screen.getByTestId('corroboration-sheet-open')).toBeDefined();
  });

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
    });
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga] })}
        reports={[]}
        currentUserId={null}
      />,
    );
    // The stack sits in its own spaced wrapper rather than butting up against
    // the headline card. first:mt-0 keeps all-tiers-pending flush.
    const stack = screen.getByText(/220/).closest('.mt-3');
    expect(stack).not.toBeNull();
    expect(stack?.className).toContain('first:mt-0');
  });

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
    });
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
    });
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga, vip] })}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(screen.queryByTestId('corroboration-sheet-open')).toBeNull();
    act(() => {
      fireEvent.click(screen.getByText('Confirm price'));
    });
    expect(screen.getByTestId('corroboration-sheet-open')).toBeDefined();
  });

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
    });
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
    });
    const event = buildBaseEvent({
      priceByTier: [headlineBlock, pendingOnlyBlock],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // Headline tier renders.
    expect(screen.getByText('$25')).toBeDefined();
    // Pending-only tier renders its price twice: the display-only TierAlternateRow
    // tell ("pending · 1/2") and the actionable pending card below it.
    expect(screen.getAllByText('$80')).toHaveLength(2);
    // VIP shows once per surface: alone as the alternate row's tier label, and
    // inside the pending card's one-line qualifier "VIP · seen on AXS"
    // (price-states-age-trust), so it is not a separate text node there.
    expect(screen.getAllByText('VIP')).toHaveLength(1);
    expect(screen.getByTestId('pending-qualifier').textContent).toBe(
      'VIP · seen on AXS',
    );
  });

  // Regression: the "other tiers" row for a tier with a live headline took its
  // kind from sourceCategory alone, so a legacy box office row (no category)
  // fell to community. The vendor is now the fallback.
  it('STATE #6 mixed-tier — a legacy box office headline tier with no category draws the box office dot', () => {
    const headline = (
      id: string,
      priceMin: string,
      vendor: TierHeadline['vendor'],
      sourceCategory: TierHeadline['sourceCategory'],
    ): TierHeadline => ({
      submissionId: id,
      priceMin,
      priceMax: null,
      vendor,
      sourceCategory,
      submitterHandle: 'ada',
      observedAt: '2026-06-20T00:00:00Z',
      approvedAt: '2026-06-20T00:00:00Z',
      approvalKind: 'fan',
      confirmsCount: 2,
    });
    const gaBlock = makeTierBlock({
      tier: 'GA',
      headline: headline('s-ga', '25', 'AXS', 'standard'),
    });
    const legacyBoxOfficeBlock = makeTierBlock({
      tier: 'Reserved',
      headline: headline('s-bal', '35', 'VenueBoxOffice', null),
    });
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
    });
    const { container } = render(
      <EventDetailPriceBlock
        event={buildBaseEvent({
          priceByTier: [gaBlock, legacyBoxOfficeBlock, pendingOnlyBlock],
        })}
        reports={[]}
        currentUserId={null}
      />,
    );
    // The Reserved row's dot is box office gold; before the fix it was azure.
    const reservedDot = Array.from(
      container.querySelectorAll<HTMLElement>(
        'div[style*="border-radius: 2.5px"]',
      ),
    ).find((dot) => dot.parentElement?.textContent?.includes('Reserved'));
    expect(reservedDot).toBeDefined();
    expect(reservedDot?.style.background).toContain('oklch(0.66 0.14 78)');
  });

  // Regression: the "other tiers" row for a pending-only tier took its kind
  // from `vendor === 'VenueBoxOffice'` alone, so a pending resale price drew
  // the community dot instead of the resale one.
  it('STATE #6 mixed-tier — a pending-only resale tier draws the resale dot in its other-tiers row', () => {
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
    });
    const pendingResaleBlock = makeTierBlock({
      tier: 'VIP',
      headline: null,
      pending: [
        {
          id: 'p-vip-resale',
          priceMin: '80',
          priceMax: null,
          vendor: 'StubHub',
          howFound: 'saw_listing',
          sourceCategory: 'resale',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 1,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    });
    const { container } = render(
      <EventDetailPriceBlock
        event={buildBaseEvent({
          priceByTier: [headlineBlock, pendingResaleBlock],
        })}
        reports={[]}
        currentUserId={null}
      />,
    );
    // TierAlternateRow's kind dot: resale is coral (JSDOM writes 0.20 as 0.2),
    // community would be azure.
    const dots = Array.from(
      container.querySelectorAll<HTMLElement>(
        'div[style*="border-radius: 2.5px"]',
      ),
    );
    expect(
      dots.some((dot) => dot.style.background.includes('oklch(0.65 0.2 25)')),
    ).toBe(true);
    expect(
      dots.some((dot) => dot.style.background.includes('oklch(0.62 0.12 240)')),
    ).toBe(false);
  });

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
    });
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
    });
    const event = buildBaseEvent({ priceByTier: [ga, vip] });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // Both pending cards render side-by-side.
    expect(screen.getByText('$40')).toBeDefined();
    expect(screen.getByText('$95')).toBeDefined();
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(latestModalOnSuccess).not.toBeNull();
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
      ]);
    });
    // MTAddTierSuccess headline copy template is `${tier} price is in. Thanks.`
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined();
  });

  it('submit success in sold-out-contribute branch → MTAddTierSuccess renders', async () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: null,
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(latestModalOnSuccess).not.toBeNull();
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
      ]);
    });
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined();
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(latestModalOnSuccess).not.toBeNull();
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
      ]);
    });
    expect(screen.getByText('VIP price is in. Thanks.')).toBeDefined();
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );

    // Drive a submit success via the stubbed modal's captured onSuccess.
    expect(latestModalOnSuccess).not.toBeNull();
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
      ]);
    });

    // MTAddTierSuccess should render with "VIP" submitted.
    // Headline copy template is `${tier} price is in. Thanks.`
    expect(screen.getByText('VIP price is in. Thanks.')).toBeDefined();

    // Add-pill row should exclude VIP — only show the other four tiers.
    const remainingTiers: Tier[] = ['GA', 'Reserved', 'Pit', 'Lawn'];
    for (const tier of remainingTiers) {
      // addPillTemplate = "+ Add <lowercase-tier>"
      const pillCopy = `Add ${tier.toLowerCase()}`;
      expect(screen.queryByText(new RegExp(pillCopy, 'i'))).not.toBeNull();
    }
    // VIP pill must NOT appear.
    expect(screen.queryByText(/Add vip/i)).toBeNull();
  });

  it('batch submit success with 2 tiers → success card shows first tier, both tiers excluded from add-pills (#832)', async () => {
    const event = buildBaseEvent({
      priceStatus: 'soldout',
      soldOutReport: null,
      ticketLinks: null,
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(latestModalOnSuccess).not.toBeNull();
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
      ]);
    });
    // MTAddTierSuccess headline reflects the FIRST submitted tier.
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined();
    // Both submitted tiers are locked out of the add-pill row...
    expect(screen.queryByText(/Add ga/i)).toBeNull();
    expect(screen.queryByText(/Add vip/i)).toBeNull();
    // ...while an unsubmitted tier still offers a pill.
    expect(screen.queryByText(/Add reserved/i)).not.toBeNull();
  });

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
    });
    const event = buildBaseEvent({ priceByTier: [ga] });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // Sheet not open before click.
    expect(screen.queryByTestId('corroboration-sheet-open')).toBeNull();
    // PendingCardB renders the "Confirm price" affordance for view='other'.
    const confirmBtn = screen.getByText('Confirm price');
    act(() => {
      fireEvent.click(confirmBtn);
    });
    // onConfirm wired to setActiveCorroborationId → sheet now mounted.
    expect(screen.getByTestId('corroboration-sheet-open')).toBeDefined();
  });

  // Regression: the corroboration sheet's kind was `vendor === 'VenueBoxOffice'`
  // alone, so confirming a pending resale price opened the sheet as community
  // and it showed no Resale pill. Both sheet mounts are covered.
  it('opens the corroboration sheet as resale for a pending resale tier price', () => {
    const ga = makeTierBlock({
      tier: 'GA',
      headline: null,
      pending: [
        {
          id: 'p-ga-resale',
          priceMin: '44',
          priceMax: null,
          vendor: 'StubHub',
          howFound: 'saw_listing',
          sourceCategory: 'resale',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    });
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent({ priceByTier: [ga] })}
        reports={[]}
        currentUserId={null}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByText('Confirm price'));
    });
    expect(
      screen.getByTestId('corroboration-sheet-open').getAttribute('data-kind'),
    ).toBe('resale');
  });

  it('opens the corroboration sheet as resale for a pending resale legacy price', () => {
    const event = buildBaseEvent({
      priceByTier: null,
      pendingSubmissions: [
        {
          id: 'p-legacy-resale',
          priceMin: '44',
          priceMax: null,
          tier: 'GA',
          vendor: 'StubHub',
          howFound: 'saw_listing',
          sourceCategory: 'resale',
          note: null,
          submitterHandle: 'jordan',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    act(() => {
      fireEvent.click(screen.getByText('Confirm price'));
    });
    expect(
      screen.getByTestId('corroboration-sheet-open').getAttribute('data-kind'),
    ).toBe('resale');
  });

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
    });
    const event = buildBaseEvent({ priceByTier: [ga] });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // view='submitter' → "Withdraw" button is rendered alongside "Edit".
    const withdrawBtn = screen.getByText('Withdraw');
    await act(async () => {
      fireEvent.click(withdrawBtn);
    });
    // Allow the void-async IIFE to resolve.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(calledUrl)).toContain('/v1/submissions/p-ga');
    expect((calledInit as RequestInit | undefined)?.method).toBe('DELETE');
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

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
    });
    const event = buildBaseEvent({ priceByTier: [ga] });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // The strip header reads "{confirms} of {needed} confirmed". Submitter
    // counts as observation #1 → must read "1 of 2" not "0 of 2".
    expect(screen.getByText(/1\s+of\s+2\s+confirmed/i)).toBeDefined();
    expect(screen.queryByText(/0\s+of\s+2\s+confirmed/i)).toBeNull();
  });

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
    });
    const event = buildBaseEvent({ priceByTier: [ga] });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(screen.getByText('Submit another price')).toBeDefined();
  });

  // The locally-promoted submission is the one stamp site whose timestamp lives
  // in client state. `localSubmissions` is seeded by a useState initializer, so
  // router.refresh() cannot advance it — this site has to reconcile its own row.
  // A passing test on the three server-prop sites would hide a break here.
  describe('locally-promoted submission — still-accurate wiring', () => {
    const staleAt = '2026-06-22T00:00:00Z';
    const buildPromotedEvent = () =>
      buildBaseEvent({
        priceByTier: null,
        pendingSubmissions: [
          {
            id: 'p-promoted',
            priceMin: '40',
            priceMax: null,
            tier: 'General Admission',
            vendor: 'AXS',
            howFound: 'saw_listing',
            sourceCategory: 'standard',
            note: null,
            submitterHandle: 'me',
            submittedAt: staleAt,
            confirmsCount: 2,
            confirmsNeeded: 2,
            isSubmitter: true,
          },
        ],
      });

    it('passes the submission id behind the displayed price', () => {
      render(
        <EventDetailPriceBlock
          event={buildPromotedEvent()}
          reports={[]}
          currentUserId={null}
        />,
      );
      expect(latestPriceDisplayProps?.priceSubmissionId).toBe('p-promoted');
      expect(latestPriceDisplayProps?.priceObservedAt).toBe(staleAt);
    });

    it('advances its own row when the sighting lands', async () => {
      render(
        <EventDetailPriceBlock
          event={buildPromotedEvent()}
          reports={[]}
          currentUserId={null}
        />,
      );
      const onSighted = latestPriceDisplayProps?.onSighted;
      expect(onSighted).toBeTypeOf('function');

      act(() => onSighted?.());

      await waitFor(() =>
        expect(latestPriceDisplayProps?.priceObservedAt).not.toBe(staleAt),
      );
      const advanced = latestPriceDisplayProps?.priceObservedAt;
      expect(advanced).toBeTruthy();
      expect(new Date(advanced ?? 0).getTime()).toBeGreaterThan(
        new Date(staleAt).getTime(),
      );
    });
  });

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
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(screen.getByText('Submit another price')).toBeDefined();
  });

  // Regression: the page picked the pending card's kind from
  // `vendor === 'VenueBoxOffice'` alone, so a pending resale price was handed
  // over as community and never showed its Resale pill (addendum 4 item 5).
  it('gives a pending resale submission the Resale trust pill', () => {
    const event = buildBaseEvent({
      priceByTier: null,
      pendingSubmissions: [
        {
          id: 'p-resale',
          priceMin: '44',
          priceMax: null,
          tier: 'GA',
          vendor: 'StubHub',
          howFound: 'saw_listing',
          sourceCategory: 'resale',
          note: null,
          submitterHandle: 'hugh',
          submittedAt: '2026-06-22T00:00:00Z',
          confirmsCount: 0,
          confirmsNeeded: 2,
          isSubmitter: false,
        },
      ],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(screen.getByTestId('trust-pill-resale')).toBeDefined();
    expect(screen.queryByTestId('trust-pill-community')).toBeNull();
  });

  // Regression — issue #895 (post-submit form re-open). Submitting from the
  // no-price branch populates localSubmissions, which flips the decision tree
  // to the legacy pending branch (4) and remounts the SubmitPriceModal. The
  // remounted modal loses its internal success state and re-renders the form.
  // The fix lifts the success payload to the parent (submitSuccessSurface) via
  // onPendingSubmitSuccess, so the success card survives the branch switch
  // instead of the form re-appearing.
  it('no-price branch: submit success shows the success surface after the pending-branch transition (#895)', async () => {
    const event = buildBaseEvent({
      ticketPriceMin: null,
      pendingSubmissions: null,
      priceByTier: null,
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );

    expect(latestModalOnSuccess).not.toBeNull();
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
      ]);
    });

    // Parent-owned success surface renders even though the block transitioned
    // into the legacy pending branch — the form did not re-open.
    expect(screen.getByText('GA price is in. Thanks.')).toBeDefined();
    expect(screen.queryByTestId('submit-price-modal-open')).toBeNull();
  });

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
    });
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
    });
    const event = buildBaseEvent({
      priceByTier: [headlineBlock, pendingOnlyBlock],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // TierAlternateRow renders "pending · {confirms}/{needed}".
    expect(screen.getByText(/pending · 1\/2/i)).toBeDefined();
    expect(screen.queryByText(/pending · 0\/2/i)).toBeNull();
  });
});

describe('EventDetailPriceBlock — crawled price, no submissions', () => {
  // Regression: this state used to render PendingCardB, dressing a
  // crawler-sourced price up as a community submission awaiting corroboration
  // ("Community", "Submitted by an anonymous fan", "1 of 2 confirmed"), with
  // an observedAt that fell back to now(). Its Confirm and "Saw a different
  // number?" buttons had no submission behind them and did nothing.
  const crawledPriceEvent = () =>
    buildBaseEvent({
      ticketPriceMin: '45.00',
      priceSource: 'structured_data',
      priceByTier: null,
      pendingSubmissions: null,
      ticketLinks: null,
      priceStatus: null,
      priceApprovalKind: null,
    });

  it('does not claim the price came from the community', () => {
    render(
      <EventDetailPriceBlock
        event={crawledPriceEvent()}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(screen.queryByText('Submitted by')).toBeNull();
    expect(screen.queryByText(/of 2 confirmed/)).toBeNull();
  });

  it('offers no corroboration affordance with nothing to corroborate', () => {
    render(
      <EventDetailPriceBlock
        event={crawledPriceEvent()}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(screen.queryByText('Confirm price')).toBeNull();
    expect(screen.queryByText('Saw a different number?')).toBeNull();
  });

  it('falls through to the standard PriceDisplay', () => {
    render(
      <EventDetailPriceBlock
        event={crawledPriceEvent()}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(screen.getByTestId('price-display-stub')).toBeDefined();
  });
});

function buildReport(overrides: Partial<EventReport> = {}): EventReport {
  return {
    id: 'report-1',
    eventId: 'evt-1',
    reporterId: 'user-reporter',
    status: 'cancelled',
    evidenceMethod: 'venue_site',
    evidenceUrl: null,
    note: null,
    createdAt: '2026-11-01T12:00:00.000Z',
    confirmsCount: 1,
    confirmsNeeded: 2,
    isReporter: false,
    userHasConfirmed: false,
    reporterHandle: 'fan',
    ...overrides,
  };
}

describe('EventDetailBanners live status source', () => {
  it('credits the fan report behind a promoted cancellation', () => {
    render(
      <EventDetailBanners
        event={{
          ...buildBaseEvent(),
          status: 'cancelled',
          statusReport: {
            reporterHandle: 'sami',
            confirmsCount: 3,
            reportedAt: new Date().toISOString(),
          },
        }}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(screen.getByText(/Reported by @sami · 3 confirms/)).toBeTruthy();
    expect(screen.queryByText(/venue's calendar/)).toBeNull();
  });

  it("names the venue's calendar when no fan report is behind it", () => {
    render(
      <EventDetailBanners
        event={{ ...buildBaseEvent(), status: 'postponed', statusReport: null }}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(screen.getByText(/From the venue's calendar/)).toBeTruthy();
  });
});

describe('EventDetailBanners pending report', () => {
  // The API never counts the reporter toward the threshold (a reporter can't
  // confirm their own report), so the banner shows the confirms as they are.
  it('shows the server confirm count against the threshold, without adding the reporter', () => {
    render(
      <EventDetailBanners
        event={buildBaseEvent()}
        reports={[buildReport({ confirmsCount: 1, confirmsNeeded: 2 })]}
        currentUserId={null}
      />,
    );
    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(screen.queryByText('2 of 2')).toBeNull();
  });

  it('gives the reporter Withdraw and no dead Add evidence button', () => {
    render(
      <EventDetailBanners
        event={buildBaseEvent()}
        reports={[buildReport({ isReporter: true })]}
        currentUserId="user-reporter"
      />,
    );
    expect(screen.getByText('Withdraw')).toBeTruthy();
    expect(screen.queryByText('Add evidence')).toBeNull();
  });

  it('drops a pending postponement on a show that is already cancelled', () => {
    render(
      <EventDetailBanners
        event={{ ...buildBaseEvent(), status: 'cancelled' }}
        reports={[buildReport({ status: 'postponed' })]}
        currentUserId={null}
      />,
    );
    expect(screen.queryByText('1 of 2')).toBeNull();
  });
});

describe('EventDetailBanners No longer listed', () => {
  const delistedEvent = () =>
    buildBaseEvent({
      status: 'cancelled',
      delistedAt: '2026-11-04T10:00:00.000Z',
    });

  it('mounts the neutral card and suppresses the red Cancelled banner', () => {
    render(
      <EventDetailBanners
        event={delistedEvent()}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(
      screen.getByRole('status', {
        name: CONSUMER_COPY.eventDetail.noLongerListedAriaLabel,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByText(REPORTING_COPY.liveReportBanner.headlines.cancelled),
    ).toBeNull();
  });

  it('still shows the Cancelled banner for a confirmed cancellation', () => {
    render(
      <EventDetailBanners
        event={buildBaseEvent({ status: 'cancelled', delistedAt: null })}
        reports={[]}
        currentUserId={null}
      />,
    );
    expect(
      screen.getByText(REPORTING_COPY.liveReportBanner.headlines.cancelled),
    ).toBeTruthy();
    expect(
      screen.queryByRole('status', {
        name: CONSUMER_COPY.eventDetail.noLongerListedAriaLabel,
      }),
    ).toBeNull();
  });

  it('drops a pending postponement report under the card, as for any cancelled show', () => {
    render(
      <EventDetailBanners
        event={delistedEvent()}
        reports={[buildReport({ status: 'postponed', isReporter: true })]}
        currentUserId="user-reporter"
      />,
    );
    expect(
      screen.getByRole('status', {
        name: CONSUMER_COPY.eventDetail.noLongerListedAriaLabel,
      }),
    ).toBeTruthy();
    // A delisted show is a cancelled one underneath, and a cancelled show takes
    // no pending report (a postponement claim on a show that is off is moot).
    expect(
      screen.queryByText(REPORTING_COPY.pendingReportBanner.postponedBadge),
    ).toBeNull();
  });
});

describe('EventDetailBanners pending Tickets available report', () => {
  it('does not offer Tickets available again from the "Saw something different?" sheet', () => {
    render(
      <EventDetailBanners
        event={buildBaseEvent({ priceStatus: 'soldout' })}
        reports={[buildReport({ status: 'available' })]}
        currentUserId={null}
      />,
    );
    fireEvent.click(
      screen.getByText(REPORTING_COPY.pendingReportBanner.footerQuestion),
    );

    const group = screen.getByRole('radiogroup');
    expect(within(group).queryByText('Tickets available')).toBeNull();
    expect(within(group).getByText('Cancelled')).toBeTruthy();
  });
});

describe('EventDetailFooter report link', () => {
  it('hides the link when nothing is left to report', () => {
    render(
      <EventDetailFooter
        event={buildBaseEvent({ status: 'cancelled' })}
        reports={[]}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the link while there is something to report', () => {
    render(<EventDetailFooter event={buildBaseEvent()} reports={[]} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

describe('EventDetailPriceBlock pending sold-out report', () => {
  it('gives the reporter Withdraw and no dead Edit button', () => {
    render(
      <EventDetailPriceBlock
        event={buildBaseEvent()}
        reports={[buildReport({ status: 'sold-out', isReporter: true })]}
        currentUserId="user-reporter"
      />,
    );
    expect(screen.getByText('Withdraw')).toBeTruthy();
    expect(screen.queryByText('Edit')).toBeNull();
  });
});

describe('EventDetailPriceBlock price check', () => {
  // The flat fields carry no tier; the card used to print the vendor in the
  // tier slot and send nothing to lock the update to.
  it('labels the checked price with its tier, not its vendor', () => {
    const counter: TierCounter = {
      id: 'counter-1',
      parentSubmissionId: 'parent-1',
      floor: 30,
      submitter: { handle: 'challenger' },
      submittedAt: '2026-11-01T12:00:00.000Z',
      lastAdminActionAt: null,
      lastAdminActionKind: null,
      pendingCount: 1,
      viewerAction: 'submit_update',
      viewerCounterId: null,
    };
    const event = buildBaseEvent({
      ticketPriceMin: '40.00',
      priceSource: 'community',
      priceVendor: 'AXS',
      counterSubmission: counter,
      priceByTier: [makeTierBlock({ tier: 'VIP', counterSubmission: counter })],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    // The card's meta line reads "VIP · seen on AXS · ...", the tier first.
    expect(screen.getByText(/^VIP ·/)).toBeTruthy();
  });

  // Every priced event carries priceByTier, which routes to the multi-tier
  // branch; the check card used to be reachable only from the legacy flat
  // branch, so it never drew. A single-tier event under a check shows it.
  const headline = (id: string) => ({
    submissionId: id,
    priceMin: '44',
    priceMax: null,
    vendor: 'Ticketmaster' as const,
    sourceCategory: 'standard' as const,
    submitterHandle: 'hugh',
    observedAt: '2026-11-01T12:00:00.000Z',
    approvedAt: '2026-11-01T12:00:00.000Z',
    approvalKind: 'fan' as const,
    confirmsCount: 2,
  });
  const counterOn = (parentId: string): TierCounter => ({
    id: `counter-on-${parentId}`,
    parentSubmissionId: parentId,
    floor: 52,
    submitter: { handle: 'rae' },
    submittedAt: '2026-11-01T12:00:00.000Z',
    lastAdminActionAt: null,
    lastAdminActionKind: null,
    pendingCount: 1,
    viewerAction: 'submit_update',
    viewerCounterId: null,
  });

  it('draws the check card for a single-tier event with a headline under a check', () => {
    const counter = counterOn('parent-1');
    const event = buildBaseEvent({
      ticketPriceMin: '44.00',
      priceSource: 'community',
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: headline('parent-1'),
          counterSubmission: counter,
        }),
      ],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(screen.getByTestId('disputed-price-card')).toBeTruthy();
    expect(screen.getByTestId('proposed-price').textContent).toBe('$52?');
    // The pending surface's "#counter-<id>" pointer lands on the card.
    expect(document.getElementById('counter-counter-on-parent-1')).toBe(
      screen.getByTestId('disputed-price-card'),
    );
  });

  it('keeps the live card on a multi-tier event, with an anchor for the pointer to land on', () => {
    const counter = counterOn('parent-1');
    const event = buildBaseEvent({
      ticketPriceMin: '44.00',
      priceSource: 'community',
      priceByTier: [
        makeTierBlock({
          tier: 'GA',
          headline: headline('parent-1'),
          counterSubmission: counter,
        }),
        makeTierBlock({ tier: 'VIP', headline: headline('parent-2') }),
      ],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(screen.queryByTestId('disputed-price-card')).toBeNull();
    expect(
      document.getElementById('counter-counter-on-parent-1'),
    ).not.toBeNull();
  });

  it('draws no anchor and no check card when no tier is under a check', () => {
    const event = buildBaseEvent({
      ticketPriceMin: '44.00',
      priceSource: 'community',
      priceByTier: [
        makeTierBlock({ tier: 'GA', headline: headline('parent-1') }),
      ],
    });
    render(
      <EventDetailPriceBlock event={event} reports={[]} currentUserId={null} />,
    );
    expect(screen.queryByTestId('disputed-price-card')).toBeNull();
    expect(screen.queryByTestId('counter-anchor')).toBeNull();
  });
});
