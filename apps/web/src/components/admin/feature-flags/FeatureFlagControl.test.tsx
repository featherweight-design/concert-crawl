// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import type { AdminFeatureFlag } from '@concert-crawl/entitlements';

// ───── Mocks ─────────────────────────────────────────────────────────────────

const patch = vi.fn();
const post = vi.fn();
const del = vi.fn();
// ApiError is declared inside the factory so vi.mock hoisting can't trip on a
// top-level reference; it carries status/message so `instanceof ApiError`
// narrows correctly inside the control's catch.
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code?: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    apiClient: {
      patch: (...args: unknown[]) => patch(...args),
      post: (...args: unknown[]) => post(...args),
      delete: (...args: unknown[]) => del(...args),
    },
    ApiError,
  };
});

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}));

import { ApiError } from '@/lib/api';
import { FeatureFlagControl } from './FeatureFlagControl';

const flag = (overrides: Partial<AdminFeatureFlag> = {}): AdminFeatureFlag => ({
  key: 'crews',
  label: 'Crews',
  description: 'The Crews tab and crew pages.',
  updatedAt: null,
  updatedBy: null,
  stage: 'off',
  stageOwnerUserId: null,
  verifiedAt: null,
  verifiedBy: null,
  verifiedNote: null,
  people: [],
  environment: 'staging',
  locked: false,
  ...overrides,
});

const step = (stage: string) => screen.getByTestId(`flag-step-crews-${stage}`);

// The ask's accept button shares its name with the row's Mark verified button,
// so it is found inside the dialog.
const acceptButton = () =>
  within(screen.getByRole('dialog')).getByRole('button', {
    name: 'Mark verified',
  });

beforeEach(() => {
  patch.mockReset();
  post.mockReset();
  del.mockReset();
});

afterEach(cleanup);

describe('FeatureFlagControl (the ladder)', () => {
  it('draws a row per flag with the four rungs and the current one selected', () => {
    render(<FeatureFlagControl initial={[flag({ stage: 'beta' })]} />);
    expect(screen.getByText('Crews')).toBeVisible();
    expect(screen.getByText('Never changed')).toBeVisible();
    for (const rung of ['off', 'me', 'beta', 'everyone']) {
      expect(step(rung)).toHaveAttribute(
        'aria-pressed',
        rung === 'beta' ? 'true' : 'false',
      );
    }
  });

  it('labels the timestamp on a flag that has been changed', () => {
    render(
      <FeatureFlagControl
        initial={[
          flag({ updatedAt: '2026-09-07T00:00:00.000Z', updatedBy: 'admin' }),
        ]}
      />,
    );
    expect(screen.getByText(/^Changed/)).toBeVisible();
    expect(screen.queryByText('Never changed')).toBeNull();
  });

  it('says how many named people a flag has', () => {
    const person = (userId: string) => ({
      userId,
      handle: userId,
      role: 'user',
      isTest: false,
      addedAt: '2026-09-07T00:00:00.000Z',
    });
    render(
      <FeatureFlagControl
        initial={[flag({ people: [person('a'), person('b')] })]}
      />,
    );
    expect(screen.getByTestId('flag-people-crews')).toHaveTextContent(
      '+ 2 people',
    );
  });

  it('moves a flag a rung on a click and reflects the answer', async () => {
    patch.mockResolvedValue(flag({ stage: 'me' }));
    render(<FeatureFlagControl initial={[flag()]} />);
    fireEvent.click(step('me'));
    await waitFor(() =>
      expect(step('me')).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(patch).toHaveBeenCalledWith('/v1/admin/feature-flags/crews', 'tok', {
      stage: 'me',
    });
  });

  it('does nothing when the current rung is clicked', () => {
    render(<FeatureFlagControl initial={[flag({ stage: 'beta' })]} />);
    fireEvent.click(step('beta'));
    expect(patch).not.toHaveBeenCalled();
  });

  it('surfaces an error and leaves the rung unchanged when the save fails', async () => {
    patch.mockRejectedValue(new Error('boom'));
    render(<FeatureFlagControl initial={[flag()]} />);
    fireEvent.click(step('beta'));
    await waitFor(() =>
      expect(screen.getByText(/Could not save the flag/)).toBeVisible(),
    );
    expect(step('off')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the verified chip, or says it is not verified', () => {
    const { unmount } = render(
      <FeatureFlagControl
        initial={[flag({ verifiedAt: '2026-09-07T00:00:00.000Z' })]}
      />,
    );
    expect(screen.getByTestId('flag-verified-crews')).toHaveTextContent(
      /^Verified/,
    );
    // The control keeps its flags in state from `initial`, so a fresh mount
    // (not a rerender) is what shows the unverified row.
    unmount();
    render(<FeatureFlagControl initial={[flag()]} />);
    expect(screen.getByTestId('flag-unverified-crews')).toHaveTextContent(
      'Not verified',
    );
  });
});

describe('FeatureFlagControl in production', () => {
  const production = (overrides: Partial<AdminFeatureFlag> = {}) =>
    flag({ environment: 'production', locked: true, ...overrides });

  it('closes the steps above the current one while the flag is locked', () => {
    render(<FeatureFlagControl initial={[production({ stage: 'me' })]} />);
    expect(step('beta')).toBeDisabled();
    expect(step('everyone')).toBeDisabled();
    // Stepping down is never blocked.
    expect(step('off')).toBeEnabled();
    expect(screen.getByTestId('flag-unverified-crews')).toHaveTextContent(
      'Locked',
    );
    expect(screen.getByText('Verify it here to go wider.')).toBeVisible();
  });

  it('opens the steps once the flag is verified in production', () => {
    render(
      <FeatureFlagControl
        initial={[
          production({
            locked: false,
            verifiedAt: '2026-09-07T00:00:00.000Z',
          }),
        ]}
      />,
    );
    expect(step('beta')).toBeEnabled();
    expect(step('everyone')).toBeEnabled();
  });

  it('asks first before Everyone, and sends confirm only after the ask', async () => {
    patch.mockResolvedValue(
      production({ stage: 'everyone', locked: false, verifiedAt: 'x' }),
    );
    render(
      <FeatureFlagControl
        initial={[
          production({
            stage: 'beta',
            locked: false,
            verifiedAt: '2026-09-07T00:00:00.000Z',
          }),
        ]}
      />,
    );
    fireEvent.click(step('everyone'));
    expect(screen.getByText('Turn Crews on for everyone?')).toBeVisible();
    expect(screen.getByTestId('everyone-ask-step')).toHaveTextContent(
      'Production Beta → Everyone',
    );
    expect(patch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn on for everyone' }),
    );
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith('/v1/admin/feature-flags/crews', 'tok', {
      stage: 'everyone',
      confirm: true,
    });
  });

  it('saves nothing when the Everyone ask is cancelled', () => {
    render(
      <FeatureFlagControl
        initial={[
          production({
            stage: 'beta',
            locked: false,
            verifiedAt: '2026-09-07T00:00:00.000Z',
          }),
        ]}
      />,
    );
    fireEvent.click(step('everyone'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(patch).not.toHaveBeenCalled();
    expect(step('beta')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not ask on staging', async () => {
    patch.mockResolvedValue(flag({ stage: 'everyone' }));
    render(<FeatureFlagControl initial={[flag({ stage: 'beta' })]} />);
    fireEvent.click(step('everyone'));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  });

  it('explains a 409: the flag is not verified here yet', async () => {
    patch.mockRejectedValue(new ApiError(409, 'flag_not_verified'));
    render(
      <FeatureFlagControl
        initial={[production({ stage: 'off', locked: false, verifiedAt: 'x' })]}
      />,
    );
    fireEvent.click(step('beta'));
    await waitFor(() =>
      expect(screen.getByText(/not verified here yet/)).toBeVisible(),
    );
  });
});

describe('FeatureFlagControl Mark verified (staging)', () => {
  const markButton = () => screen.queryByTestId('flag-mark-verified-crews');

  it('offers Mark verified once the flag is on for anyone, not while Off', () => {
    const { unmount } = render(<FeatureFlagControl initial={[flag()]} />);
    expect(markButton()).toBeNull();
    unmount();
    render(<FeatureFlagControl initial={[flag({ stage: 'me' })]} />);
    expect(markButton()).toBeVisible();
    expect(screen.getByText('Unlocks production')).toBeVisible();
  });

  it('draws no Mark verified control in production', () => {
    render(
      <FeatureFlagControl
        initial={[
          flag({ stage: 'me', environment: 'production', locked: true }),
        ]}
      />,
    );
    expect(markButton()).toBeNull();
  });

  it('needs all three ticks, then sends the checks and the note', async () => {
    post.mockResolvedValue(
      flag({ stage: 'me', verifiedAt: '2026-09-07T00:00:00.000Z' }),
    );
    render(<FeatureFlagControl initial={[flag({ stage: 'me' })]} />);
    fireEvent.click(screen.getByTestId('flag-mark-verified-crews'));
    expect(screen.getByText('Mark Crews verified?')).toBeVisible();
    const accept = acceptButton();
    expect(accept).toBeDisabled();
    for (const key of ['triedAsMe', 'checkedOnPhone', 'checkedFlagOff']) {
      fireEvent.click(screen.getByTestId(`verify-check-${key}`));
    }
    fireEvent.change(screen.getByTestId('verify-note'), {
      target: { value: ' Works on iPhone ' },
    });
    expect(accept).toBeEnabled();
    fireEvent.click(accept);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/v1/admin/feature-flags/crews/verify',
      'tok',
      {
        note: 'Works on iPhone',
        checks: {
          triedAsMe: true,
          checkedOnPhone: true,
          checkedFlagOff: true,
        },
      },
    );
    await waitFor(() =>
      expect(screen.getByTestId('flag-verified-crews')).toBeVisible(),
    );
  });

  it('omits the note when it is empty', async () => {
    post.mockResolvedValue(
      flag({ stage: 'me', verifiedAt: '2026-09-07T00:00:00.000Z' }),
    );
    render(<FeatureFlagControl initial={[flag({ stage: 'me' })]} />);
    fireEvent.click(screen.getByTestId('flag-mark-verified-crews'));
    for (const key of ['triedAsMe', 'checkedOnPhone', 'checkedFlagOff']) {
      fireEvent.click(screen.getByTestId(`verify-check-${key}`));
    }
    fireEvent.click(acceptButton());
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]?.[2]).not.toHaveProperty('note');
  });

  it('saves nothing when the ask is cancelled', () => {
    render(<FeatureFlagControl initial={[flag({ stage: 'me' })]} />);
    fireEvent.click(screen.getByTestId('flag-mark-verified-crews'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the ask open, with its ticks, and says so when the mark fails', async () => {
    post.mockRejectedValue(new Error('boom'));
    render(<FeatureFlagControl initial={[flag({ stage: 'me' })]} />);
    fireEvent.click(screen.getByTestId('flag-mark-verified-crews'));
    for (const key of ['triedAsMe', 'checkedOnPhone', 'checkedFlagOff']) {
      fireEvent.click(screen.getByTestId(`verify-check-${key}`));
    }
    fireEvent.click(acceptButton());
    await waitFor(() =>
      expect(
        within(screen.getByRole('dialog')).getByRole('alert'),
      ).toHaveTextContent(/Could not update the verified mark/),
    );
    // Still open, nothing to redo.
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByTestId('verify-check-triedAsMe')).toBeChecked();
    expect(acceptButton()).toBeEnabled();
  });

  it('ignores a second save while one is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    del.mockResolvedValue(flag({ stage: 'me' }));
    render(
      <FeatureFlagControl
        initial={[
          flag({ stage: 'me' }),
          flag({
            key: 'release-notes',
            label: 'Release notes',
            stage: 'me',
            verifiedAt: '2026-09-07T00:00:00.000Z',
          }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId('flag-mark-verified-crews'));
    for (const key of ['triedAsMe', 'checkedOnPhone', 'checkedFlagOff']) {
      fireEvent.click(screen.getByTestId(`verify-check-${key}`));
    }
    fireEvent.click(acceptButton());
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('flag-undo-verified-release-notes'));
    expect(del).not.toHaveBeenCalled();
    finish(flag({ stage: 'me', verifiedAt: '2026-09-07T00:00:00.000Z' }));
  });

  it('undoes the mark with the Undo link', async () => {
    del.mockResolvedValue(flag({ stage: 'me' }));
    render(
      <FeatureFlagControl
        initial={[
          flag({ stage: 'me', verifiedAt: '2026-09-07T00:00:00.000Z' }),
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId('flag-undo-verified-crews'));
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith(
      '/v1/admin/feature-flags/crews/verify',
      'tok',
    );
    await waitFor(() =>
      expect(screen.getByTestId('flag-mark-verified-crews')).toBeVisible(),
    );
  });
});
