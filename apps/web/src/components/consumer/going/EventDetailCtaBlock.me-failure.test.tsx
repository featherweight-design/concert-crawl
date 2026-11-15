// @vitest-environment jsdom

// W3 regression: the real useEntitlement, a signed-in fan, and a failed
// /v1/users/me. The app is free, so the Going button must stay live: no
// "Needs a paid plan" treatment, and a tap marks Going rather than sending a
// signed-in fan to sign-in or the picker.

import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { featureFlagDefaults } from '@concert-crawl/entitlements';
import { stubMatchMedia } from '@/test-utils/match-media';
import { planStateQueryKey } from '@/lib/queries/use-plan-state';
import { GOING_COPY } from './definitions/copy';
import type { GoingCtaEvent } from './EventDetailCtaBlock';

const mutate = vi.fn();
const refresh = vi.fn();
const push = vi.fn();
const mockFetchMe = vi.fn();

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
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutateAsync: mutate, isPending: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
  usePathname: () => '/events/ev1',
}));
vi.mock('./lib/attendance-toasts', () => ({
  showStampedToast: vi.fn(),
  showRemovedToast: vi.fn(),
  showAttendanceError: vi.fn(),
}));
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}));

const { EventDetailCtaBlock } = await import('./EventDetailCtaBlock');

const event: GoingCtaEvent = {
  id: 'ev1',
  artist: 'Khruangbin',
  date: '2099-10-14',
  status: 'upcoming',
  attendingAt: null,
  showTime: '20:00:00',
  genre: ['rock'],
  artistPhotoUrl: null,
  venue: {
    timezone: 'America/Denver',
    name: 'Gothic Theatre',
    slug: 'gothic-theatre',
    city: 'Englewood',
  },
};

const goingButton = (): HTMLElement => {
  const found = screen
    .getAllByRole('button')
    .find((btn) => !btn.hasAttribute('aria-expanded'));
  if (found === undefined) throw new Error('no commitment CTA rendered');
  return found;
};

describe('EventDetailCtaBlock, signed in with /v1/users/me failing', () => {
  beforeEach(() => {
    stubMatchMedia(false);
    mutate.mockReset();
    mutate.mockResolvedValue({ going: true, attendingAt: null });
    push.mockReset();
    mockFetchMe.mockReset();
    mockFetchMe.mockRejectedValue(new Error('500'));
  });
  afterEach(cleanup);

  it('keeps Going live and marks it on tap', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <EventDetailCtaBlock event={event} scaRegion={false} />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(
        queryClient.getQueryState(planStateQueryKey('user_test'))?.status,
      ).toBe('error'),
    );

    expect(screen.queryByText(GOING_COPY.locked.line)).toBeNull();
    expect(goingButton()).not.toHaveAttribute(
      'aria-label',
      GOING_COPY.locked.aria,
    );

    fireEvent.click(goingButton());
    expect(mutate).toHaveBeenCalledWith({ eventId: 'ev1', going: true });
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tier-picker')).toBeNull();
  });
});
