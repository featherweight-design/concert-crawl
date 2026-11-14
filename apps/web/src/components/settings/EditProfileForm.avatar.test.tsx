// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserProfileResponse } from '@concert-crawl/types';

const { mockPatchMe } = vi.hoisted(() => ({ mockPatchMe: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('token'),
    userId: 'user_1',
  }),
}));
vi.mock('@/lib/users', () => ({
  patchMe: mockPatchMe,
  checkHandleAvailability: vi.fn(),
}));

import { EditProfileForm } from './EditProfileForm';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const COPY = CONSUMER_COPY.settings;

const profile = (over: Partial<UserProfileResponse>): UserProfileResponse => ({
  id: 'user_1',
  email: 'ada@example.com',
  handle: 'adal',
  city: null,
  avatarColor: 'signal',
  avatarSecondColor: null,
  theme: 'electric',
  planState: {
    plan: 'free',
    onTrial: false,
    trialEndsAt: null,
    status: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    roleComped: false,
  },
  displayRole: 'fan',
  roleBadge: null,
  joined: 'Apr 2026',
  submissionCount: 0,
  submissionCounts: {
    total: 0,
    live: 0,
    pending: 0,
    priceChecks: 0,
    closed: 0,
  },
  cred: 0,
  founderWindow: { state: 'pre-launch', seatsTotal: 100, closesAt: null },
  ...over,
});

const renderForm = (over: Partial<UserProfileResponse> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditProfileForm profile={profile(over)} onClose={vi.fn()} />
    </QueryClientProvider>,
  );

const save = () =>
  fireEvent.click(screen.getByRole('button', { name: COPY.editSaveButton }));

afterEach(() => {
  cleanup();
  mockPatchMe.mockReset();
});

// The API, the column and every reader already handle the pair; only the
// picker ever sent it, and it never did, so no one could have two colours.
describe('EditProfileForm avatar colours', () => {
  it('saves a picked pair as both colours', async () => {
    mockPatchMe.mockResolvedValue(undefined);
    renderForm();
    fireEvent.click(
      screen.getByLabelText(
        COPY.avatarPairSwatchAriaLabel('accent', 'warning'),
      ),
    );
    save();
    await waitFor(() => expect(mockPatchMe).toHaveBeenCalledTimes(1));
    expect(mockPatchMe.mock.calls[0]?.[1]).toMatchObject({
      avatarColor: 'accent',
      avatarSecondColor: 'warning',
    });
  });

  it('sends a null second colour for a solid, so a saved pair is cleared', async () => {
    mockPatchMe.mockResolvedValue(undefined);
    renderForm({ avatarColor: 'signal', avatarSecondColor: 'accent' });
    fireEvent.click(
      screen.getByLabelText(COPY.avatarColorSwatchAriaLabel('success')),
    );
    save();
    await waitFor(() => expect(mockPatchMe).toHaveBeenCalledTimes(1));
    expect(mockPatchMe.mock.calls[0]?.[1]).toMatchObject({
      avatarColor: 'success',
      avatarSecondColor: null,
    });
  });

  it('keeps the saved pair when the colours are not touched', async () => {
    mockPatchMe.mockResolvedValue(undefined);
    renderForm({ avatarColor: 'success', avatarSecondColor: 'signal' });
    save();
    await waitFor(() => expect(mockPatchMe).toHaveBeenCalledTimes(1));
    expect(mockPatchMe.mock.calls[0]?.[1]).toMatchObject({
      avatarColor: 'success',
      avatarSecondColor: 'signal',
    });
  });

  it('draws the label above the picker card', () => {
    renderForm();
    const label = screen.getByText(COPY.avatarColorLabel);
    const card = screen.getByTestId('avatar-picker');
    expect(
      label.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
