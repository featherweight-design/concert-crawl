// @vitest-environment jsdom

// W5 regression: the real useEntitlement, a signed-in fan, and a failed
// /v1/users/me. The app is free and /history has no paywall, so a failed
// plan fetch must still draw Concerts for a signed-in fan.

import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { featureFlagDefaults } from '@concert-crawl/entitlements';
import type { HistoryResponse } from '@concert-crawl/types';
import { planStateQueryKey } from '@/lib/queries/use-plan-state';

const mockFetchMe = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('tok'),
    isSignedIn: true,
    userId: 'user_test',
  }),
  useUser: () => ({ user: { username: 'huey' } }),
}));
vi.mock('@/lib/users', () => ({
  fetchMe: (token: string) => mockFetchMe(token),
}));
vi.mock('@/lib/queries/use-feature-flags', () => ({
  useFeatureFlags: () => ({ data: featureFlagDefaults(), isPending: false }),
}));

const EMPTY: HistoryResponse = {
  past: [],
  upcoming: [],
  stats: {
    nights: 0,
    venues: 0,
    artists: 0,
    topGenre: null,
    topVenue: null,
    first: null,
    last: null,
    totalSpent: null,
  },
};
vi.mock('@/lib/queries/use-history', () => ({
  useHistory: () => ({ data: EMPTY }),
}));
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/components/consumer/going/lib/attendance-toasts', () => ({
  showRemovedToast: vi.fn(),
  showAttendanceError: vi.fn(),
}));
vi.mock('@/lib/hooks/useIsMobileViewport', () => ({
  useIsMobileViewport: () => true,
}));
vi.mock('@/components/consumer/share/ShareSheet', () => ({
  ShareSheet: () => null,
}));
vi.mock('@/lib/history', () => ({
  downloadHistoryIcs: () => Promise.resolve(),
}));
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: () => null,
}));
vi.mock('./AddShowRow', () => ({
  AddShowRow: () => null,
}));
vi.mock('./AddShowSheet', () => ({
  AddShowSheet: () => null,
}));

import { HistoryContent } from './HistoryContent';
import { HISTORY_COPY } from './definitions/copy';

afterEach(cleanup);

describe('HistoryContent, signed in with /v1/users/me failing', () => {
  it('draws Concerts', async () => {
    mockFetchMe.mockRejectedValue(new Error('500'));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <HistoryContent initialData={EMPTY} />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(
        queryClient.getQueryState(planStateQueryKey('user_test'))?.status,
      ).toBe('error'),
    );

    expect(screen.getByText(HISTORY_COPY.empty.headline)).toBeInTheDocument();
  });
});
