// @vitest-environment jsdom

// Where it's sold replaces the price card's seller alternates (plan Q5): the
// price slot and the vendor card together list each seller once.

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EventDetailResponse } from '@concert-crawl/types';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('test-token'),
    isLoaded: true,
    isSignedIn: true,
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/components/consumer/submit-price/SubmitPriceModal', () => ({
  SubmitPriceModal: () => null,
}));
vi.mock('@/components/consumer/CorroborationSheet', () => ({
  CorroborationSheet: () => null,
}));

import { EventDetailPriceBlock } from '@/components/consumer/EventDetailClient';
import { WhereItsSoldCard } from './WhereItsSoldCard';
import { buildWhereItsSoldRows } from './rows';

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
});

afterEach(() => {
  cleanup();
});

type Alternates = NonNullable<EventDetailResponse['priceAlternates']>;

const AXS: Alternates[number] = {
  id: 'axs',
  tier: 'GA',
  vendor: 'AXS',
  priceMin: '47.00',
  priceMax: null,
  sourceCategory: 'standard',
};
const BOX_OFFICE: Alternates[number] = {
  id: 'vbo',
  tier: 'GA',
  vendor: 'VenueBoxOffice',
  priceMin: '38.00',
  priceMax: null,
  sourceCategory: 'boxoffice',
};

// The flat price shape that reaches MixedTierCard: a live Ticketmaster price
// with seller alternates.
function buildEvent(priceAlternates: Alternates): EventDetailResponse {
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
    ticketPriceMin: '45.00',
    ticketPriceMax: null,
    priceSource: 'community',
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
    priceStatus: 'live',
    priceVendor: 'Ticketmaster',
    priceSubmissionId: 'tm',
    priceAlternates,
  };
}

function renderPriceArea(event: EventDetailResponse) {
  const rows = buildWhereItsSoldRows(event);
  return render(
    <>
      <EventDetailPriceBlock event={event} reports={[]} currentUserId="u1" />
      <WhereItsSoldCard rows={rows} />
    </>,
  );
}

describe('Where it’s sold on the event page', () => {
  it('lists each seller once: the price card drops its alternates', () => {
    renderPriceArea(buildEvent([AXS, BOX_OFFICE]));
    expect(screen.getByTestId('where-its-sold')).toBeDefined();
    expect(screen.getAllByText(/AXS/)).toHaveLength(1);
    expect(screen.getAllByText(/Venue box office/)).toHaveLength(1);
  });

  it('keeps the price card’s headline, without the alternate rows', () => {
    renderPriceArea(buildEvent([AXS, BOX_OFFICE]));
    expect(screen.getByText('seen on Ticketmaster')).toBeDefined();
    expect(screen.queryByText('Other tiers')).toBeNull();
  });

  it('leaves the alternates on the price card when the vendor card is off', () => {
    // Venue box office alone beside Ticketmaster's flat price is one seller
    // in the card's rows (the primary is not in priceByTier), so no card.
    renderPriceArea(buildEvent([BOX_OFFICE]));
    expect(screen.queryByTestId('where-its-sold')).toBeNull();
    expect(screen.getByText('Other tiers')).toBeDefined();
  });
});
