// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from '@testing-library/react';
import type { AdminFeatureFlag } from '@concert-crawl/entitlements';

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    apiClient: {
      get: (...args: unknown[]) => get(...args),
      post: (...args: unknown[]) => post(...args),
      delete: (...args: unknown[]) => del(...args),
      patch: vi.fn(),
    },
    ApiError,
  };
});

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}));

import { FeatureFlagControl } from './FeatureFlagControl';

const flag = (overrides: Partial<AdminFeatureFlag> = {}): AdminFeatureFlag => ({
  key: 'crews',
  label: 'Crews',
  description: 'The Crews tab and crew pages.',
  enabled: false,
  updatedAt: null,
  updatedBy: null,
  stage: 'beta',
  stageOwnerUserId: null,
  verifiedAt: null,
  verifiedBy: null,
  verifiedNote: null,
  verifiedByHandle: null,
  people: [],
  betaCount: 38,
  environment: 'staging',
  locked: false,
  ...overrides,
});

const historyRows = [
  {
    id: 'h2',
    kind: 'person_added',
    fromStage: null,
    toStage: null,
    subjectHandle: 'theo.wav',
    actorHandle: 'hugh',
    createdAt: '2026-09-08T12:00:00.000Z',
  },
  {
    id: 'h1',
    kind: 'stage_set',
    fromStage: 'me',
    toStage: 'beta',
    subjectHandle: null,
    actorHandle: 'hugh',
    createdAt: '2026-09-07T12:00:00.000Z',
  },
];

const openDrawer = (initial: AdminFeatureFlag) => {
  render(<FeatureFlagControl initial={[initial]} />);
  fireEvent.click(screen.getByTestId('flag-open-crews'));
  return screen.getByTestId('flag-drawer-crews');
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  del.mockReset();
  get.mockImplementation(async () => historyRows);
});

afterEach(cleanup);

describe('the flag drawer', () => {
  it('opens from the flag name with the ladder on the current rung', () => {
    const drawer = openDrawer(flag());
    expect(within(drawer).getByText('Who sees it on staging')).toBeVisible();
    expect(within(drawer).getByText('Staging admin')).toBeVisible();
    expect(
      within(drawer).getByTestId('drawer-flag-step-crews-beta'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the production environment there', () => {
    const drawer = openDrawer(flag({ environment: 'production' }));
    expect(within(drawer).getByText('Production admin')).toBeVisible();
    expect(within(drawer).getByText('Who sees it in production')).toBeVisible();
  });

  it('moves the flag from the drawer ladder', async () => {
    const patch = vi.fn();
    const { apiClient } = await import('@/lib/api');
    vi.spyOn(apiClient, 'patch').mockImplementation(patch);
    patch.mockResolvedValue(flag({ stage: 'everyone' }));
    const drawer = openDrawer(flag());
    fireEvent.click(
      within(drawer).getByTestId('drawer-flag-step-crews-everyone'),
    );
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith('/v1/admin/feature-flags/crews', 'tok', {
      stage: 'everyone',
    });
  });

  it('closes from the X', () => {
    openDrawer(flag());
    fireEvent.click(screen.getByTestId('flag-drawer-close'));
    expect(screen.queryByTestId('flag-drawer-crews')).toBeNull();
  });

  it('does not close on a press that began inside the panel', () => {
    const drawer = openDrawer(flag());
    // A text selection dragged from the panel out onto the scrim.
    fireEvent.mouseDown(within(drawer).getByText('Crews', { selector: 'h3' }));
    fireEvent.click(drawer);
    expect(screen.getByTestId('flag-drawer-crews')).toBeVisible();
    // A real press on the scrim closes it.
    fireEvent.mouseDown(drawer);
    fireEvent.click(drawer);
    expect(screen.queryByTestId('flag-drawer-crews')).toBeNull();
  });

  it('shows the verified line with who, the note, and Undo on staging', () => {
    const drawer = openDrawer(
      flag({
        verifiedAt: '2026-09-07T12:00:00.000Z',
        verifiedByHandle: 'hugh',
        verifiedNote: 'Works on iPhone',
      }),
    );
    const line = within(drawer).getByTestId('flag-drawer-verified');
    expect(line).toHaveTextContent('Verified Sep 7 by @hugh');
    expect(line).toHaveTextContent('“Works on iPhone”');
    expect(
      within(drawer).getByTestId('flag-drawer-undo-verified'),
    ).toBeVisible();
  });

  it('draws no Undo in production', () => {
    const drawer = openDrawer(
      flag({
        environment: 'production',
        verifiedAt: '2026-09-07T12:00:00.000Z',
        verifiedByHandle: 'hugh',
      }),
    );
    expect(
      within(drawer).queryByTestId('flag-drawer-undo-verified'),
    ).toBeNull();
  });

  it('offers Mark verified on a staging flag that is on and not yet verified', () => {
    const drawer = openDrawer(flag());
    expect(
      within(drawer).getByTestId('flag-drawer-mark-verified'),
    ).toBeVisible();
    cleanup();
    const off = openDrawer(flag({ stage: 'off' }));
    expect(within(off).queryByTestId('flag-drawer-mark-verified')).toBeNull();
  });

  it('reads the History from the API, newest first, in plain lines', async () => {
    const drawer = openDrawer(flag());
    await waitFor(() =>
      expect(within(drawer).getByText('@hugh added @theo.wav')).toBeVisible(),
    );
    expect(within(drawer).getByText('@hugh: Me → Beta')).toBeVisible();
    expect(get).toHaveBeenCalledWith(
      '/v1/admin/feature-flags/crews/history',
      'tok',
    );
  });

  it('says when there is no History, and when it could not load', async () => {
    get.mockImplementation(async () => []);
    const drawer = openDrawer(flag());
    await waitFor(() =>
      expect(within(drawer).getByText('History starts Nov 2026')).toBeVisible(),
    );
    cleanup();
    get.mockImplementation(async () => {
      throw new Error('boom');
    });
    const failing = openDrawer(flag());
    await waitFor(() =>
      expect(
        within(failing).getByText('Could not load the history.'),
      ).toBeVisible(),
    );
  });
});
