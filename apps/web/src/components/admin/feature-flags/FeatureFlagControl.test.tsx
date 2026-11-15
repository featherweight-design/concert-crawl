// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import type { AdminFeatureFlag } from '@concert-crawl/entitlements';

// ───── Mocks ─────────────────────────────────────────────────────────────────

const patch = vi.fn();
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
  enabled: false,
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

beforeEach(() => {
  patch.mockReset();
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

  it('reads the old boolean when a payload has no stage', () => {
    // An older payload: the ladder fields are simply absent.
    const legacy: AdminFeatureFlag = {
      key: 'crews',
      label: 'Crews',
      description: 'The Crews tab and crew pages.',
      enabled: true,
      updatedAt: null,
      updatedBy: null,
    };
    render(<FeatureFlagControl initial={[legacy]} />);
    expect(step('everyone')).toHaveAttribute('aria-pressed', 'true');
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
