// @vitest-environment jsdom

// W5 regression: the real useEntitlement, a signed-in fan, and a failed
// /v1/users/me. The app is free and /passport has no paywall, so a failed
// plan fetch must still draw the booklet for a signed-in fan.

import '@testing-library/jest-dom';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { featureFlagDefaults } from '@concert-crawl/entitlements';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { planStateQueryKey } from '@/lib/queries/use-plan-state';
import { ThemeProvider } from '@/theme';
import { PassportContent } from '../PassportContent';

const mockFetchMe = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('tok'),
    isSignedIn: true,
    userId: 'user_test',
  }),
}));
vi.mock('@/lib/users', () => ({
  fetchMe: (token: string) => mockFetchMe(token),
}));
vi.mock('@/lib/queries/use-feature-flags', () => ({
  useFeatureFlags: () => ({ data: featureFlagDefaults(), isPending: false }),
}));
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: () => null,
}));

const objectUrlApi = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) }),
    ),
  );
  URL.createObjectURL = vi.fn(() => 'blob:passport');
  URL.revokeObjectURL = vi.fn();
  mockFetchMe.mockReset();
  mockFetchMe.mockRejectedValue(new Error('500'));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  URL.createObjectURL = objectUrlApi.create;
  URL.revokeObjectURL = objectUrlApi.revoke;
});

const PAST: HistoryShow[] = [
  {
    eventId: 'a',
    artist: 'Wednesday',
    artistPhotoUrl: null,
    venueName: 'Larimer Lounge',
    venueSlug: 'larimer-lounge',
    venueCity: 'Denver',
    venueTimezone: 'America/Denver',
    rawShowTime: null,
    neighborhood: null,
    date: '2026-05-14',
    dateLabel: 'Thu, May 14',
    showTime: null,
    priceFinal: 22,
    genre: 'indie',
    attendingAt: '2026-05-14T01:00:00Z',
  },
];

describe('PassportContent, signed in with /v1/users/me failing', () => {
  it('draws the booklet', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PassportContent
            past={PAST}
            upcoming={[]}
            activeVenues={[{ slug: 'larimer-lounge', name: 'Larimer Lounge' }]}
            identity={{
              handle: 'hugh',
              city: 'Denver',
              avatarColor: null,
              year: 2026,
            }}
            today="2026-11-11"
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // Passport no longer reads the plan at all, so a failing /me can't lock it.
    expect(
      screen.getByRole('region', { name: CONSUMER_COPY.passport.bookletLabel }),
    ).toBeInTheDocument();
    expect(
      queryClient.getQueryState(planStateQueryKey('user_test')),
    ).toBeUndefined();
  });
});
