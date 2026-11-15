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
import type {
  AdminFeatureFlag,
  AdminFlagPerson,
} from '@concert-crawl/entitlements';

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

const person = (
  userId: string,
  overrides: Partial<AdminFlagPerson> = {},
): AdminFlagPerson => ({
  userId,
  handle: userId,
  role: 'user',
  isTest: false,
  addedAt: '2026-09-07T12:00:00.000Z',
  ...overrides,
});

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
  get.mockImplementation(async (path: string) => {
    if (path.includes('/history')) return historyRows;
    return { people: [] };
  });
});

afterEach(cleanup);

describe('the flag drawer', () => {
  it('opens from the flag name and names who sees it and how many', async () => {
    const drawer = openDrawer(flag());
    expect(within(drawer).getByText('Who sees it on staging')).toBeVisible();
    expect(within(drawer).getByText(/Beta is 38 people\./)).toBeVisible();
    expect(within(drawer).getByText('Staging admin')).toBeVisible();
    expect(
      within(drawer).getByTestId('drawer-flag-step-crews-beta'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('closes from the X', () => {
    openDrawer(flag());
    fireEvent.click(screen.getByTestId('flag-drawer-close'));
    expect(screen.queryByTestId('flag-drawer-crews')).toBeNull();
  });

  it('lists each named person with handle, role, added date and the test mark', () => {
    const drawer = openDrawer(
      flag({
        people: [
          person('theo.wav', { role: 'user' }),
          person('andre.r', { role: 'user', isTest: true }),
        ],
      }),
    );
    const theo = within(drawer).getByTestId('flag-person-theo.wav');
    expect(theo).toHaveTextContent('@theo.wav');
    expect(theo).toHaveTextContent('Member · added Sep 7');
    expect(within(drawer).getByTestId('flag-person-andre.r')).toHaveTextContent(
      'Member · added Sep 7 · TEST',
    );
  });

  it('says nothing about a role it could not read', () => {
    const drawer = openDrawer(
      flag({ people: [person('ana', { role: null })] }),
    );
    expect(within(drawer).getByTestId('flag-person-ana')).not.toHaveTextContent(
      'Member',
    );
  });

  it('says so when nobody else is named', () => {
    const drawer = openDrawer(flag());
    expect(within(drawer).getByTestId('flag-people-empty')).toHaveTextContent(
      'Nobody else is named yet.',
    );
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

  it('draws no Undo or Mark verified in production', () => {
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
    expect(within(drawer).getByText('Production admin')).toBeVisible();
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

  it('removes a person and offers Undo, which adds them back', async () => {
    del.mockResolvedValue(flag({ people: [] }));
    post.mockResolvedValue(flag({ people: [person('theo.wav')] }));
    const drawer = openDrawer(flag({ people: [person('theo.wav')] }));
    fireEvent.click(within(drawer).getByTestId('flag-person-remove-theo.wav'));
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith(
      '/v1/admin/feature-flags/crews/people/theo.wav',
      'tok',
    );
    const toast = await screen.findByTestId('flag-people-toast');
    expect(toast).toHaveTextContent('Removed @theo.wav');
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/v1/admin/feature-flags/crews/people',
      'tok',
      { userId: 'theo.wav' },
    );
  });

  it('only says how big Beta is at Beta, and only introduces people when there are some', () => {
    openDrawer(flag({ stage: 'everyone' }));
    const drawer = screen.getByTestId('flag-drawer-crews');
    expect(within(drawer).queryByText(/Beta is/)).toBeNull();
    expect(within(drawer).queryByText(/Also on for/)).toBeNull();
  });

  it('keeps the Undo toast when the re-add fails, so it can be tried again', async () => {
    del.mockResolvedValue(flag({ people: [] }));
    post.mockRejectedValue(new Error('boom'));
    const drawer = openDrawer(flag({ people: [person('theo.wav')] }));
    fireEvent.click(within(drawer).getByTestId('flag-person-remove-theo.wav'));
    const toast = await screen.findByTestId('flag-people-toast');
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        within(drawer).getByText('Could not update the people. Try again.'),
      ).toBeVisible(),
    );
    expect(screen.getByTestId('flag-people-toast')).toBeVisible();
  });

  it('ignores a second people change while one is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    del.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const drawer = openDrawer(
      flag({ people: [person('theo.wav'), person('sam')] }),
    );
    fireEvent.click(within(drawer).getByTestId('flag-person-remove-theo.wav'));
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(within(drawer).getByTestId('flag-person-remove-sam')).toBeDisabled();
    fireEvent.click(within(drawer).getByTestId('flag-person-remove-sam'));
    expect(del).toHaveBeenCalledTimes(1);
    finish(flag({ people: [person('sam')] }));
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

  it('keeps focus in the panel when it comes back from the search', () => {
    const drawer = openDrawer(flag());
    fireEvent.click(within(drawer).getByTestId('flag-people-add-trigger'));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Back' }));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('says so when a people change fails', async () => {
    del.mockRejectedValue(new Error('boom'));
    const drawer = openDrawer(flag({ people: [person('theo.wav')] }));
    fireEvent.click(within(drawer).getByTestId('flag-person-remove-theo.wav'));
    await waitFor(() =>
      expect(
        within(drawer).getByText('Could not update the people. Try again.'),
      ).toBeVisible(),
    );
    expect(screen.queryByTestId('flag-people-toast')).toBeNull();
  });
});

describe('adding a person', () => {
  const results = {
    people: [
      { id: 'u-ana', handle: 'ana.b', role: 'beta', isTestAccount: false },
      { id: 'u-anaya', handle: 'anaya', role: 'user', isTestAccount: false },
      { id: 'u-andre', handle: 'andre.r', role: 'user', isTestAccount: true },
    ],
  };

  const search = async (initial: AdminFeatureFlag) => {
    get.mockImplementation(async (path: string) =>
      path.includes('/history') ? [] : results,
    );
    const drawer = openDrawer(initial);
    fireEvent.click(within(drawer).getByTestId('flag-people-add-trigger'));
    fireEvent.change(screen.getByTestId('flag-people-query'), {
      target: { value: 'an' },
    });
    await screen.findByTestId('flag-people-result-u-ana');
    return drawer;
  };

  it('searches handles and marks who already sees the flag and who is a test account', async () => {
    await search(flag({ stage: 'beta' }));
    expect(get).toHaveBeenCalledWith(
      '/v1/admin/people?search=an&test=include&limit=8',
      'tok',
    );
    // At Beta a Beta-role person already sees it: no Add for them.
    expect(screen.getByTestId('flag-people-result-u-ana')).toHaveTextContent(
      'Beta · already sees it',
    );
    expect(screen.queryByTestId('flag-people-add-u-ana')).toBeNull();
    expect(screen.getByTestId('flag-people-result-u-andre')).toHaveTextContent(
      'Member · TEST',
    );
    expect(screen.getByTestId('flag-people-add-u-anaya')).toBeVisible();
    expect(
      screen.getByText(
        'People already in the step say so. Test accounts are marked.',
      ),
    ).toBeVisible();
  });

  it('adds the person and keeps the search open', async () => {
    post.mockResolvedValue(flag({ people: [person('u-anaya')] }));
    await search(flag({ stage: 'beta' }));
    fireEvent.click(screen.getByTestId('flag-people-add-u-anaya'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith(
      '/v1/admin/feature-flags/crews/people',
      'tok',
      { userId: 'u-anaya' },
    );
    // Now named, so the result says it already sees the flag.
    await waitFor(() =>
      expect(
        screen.getByTestId('flag-people-result-u-anaya'),
      ).toHaveTextContent('already sees it'),
    );
  });

  it('says when nobody matches or the search fails', async () => {
    get.mockImplementation(async (path: string) =>
      path.includes('/history') ? [] : { people: [] },
    );
    const drawer = openDrawer(flag());
    fireEvent.click(within(drawer).getByTestId('flag-people-add-trigger'));
    fireEvent.change(screen.getByTestId('flag-people-query'), {
      target: { value: 'zz' },
    });
    await screen.findByText('No one matches.');
    get.mockImplementation(async () => {
      throw new Error('boom');
    });
    fireEvent.change(screen.getByTestId('flag-people-query'), {
      target: { value: 'zzz' },
    });
    await screen.findByText('Could not search. Try again.');
  });

  it('says so, in the search view, when an add fails', async () => {
    post.mockRejectedValue(new Error('boom'));
    await search(flag({ stage: 'beta' }));
    fireEvent.click(screen.getByTestId('flag-people-add-u-anaya'));
    await waitFor(() =>
      expect(
        within(screen.getByTestId('flag-people-search')).getByRole('alert'),
      ).toHaveTextContent('Could not update the people. Try again.'),
    );
  });

  it('treats the Me owner and named people as already seeing it at Me', async () => {
    get.mockImplementation(async (path: string) =>
      path.includes('/history') ? [] : results,
    );
    const drawer = openDrawer(flag({ stage: 'me', stageOwnerUserId: 'u-ana' }));
    fireEvent.click(within(drawer).getByTestId('flag-people-add-trigger'));
    fireEvent.change(screen.getByTestId('flag-people-query'), {
      target: { value: 'an' },
    });
    await screen.findByTestId('flag-people-result-u-ana');
    expect(screen.getByTestId('flag-people-result-u-ana')).toHaveTextContent(
      'already sees it',
    );
    // A Beta-role person does not see a flag at Me because of the role.
    expect(screen.getByTestId('flag-people-add-u-anaya')).toBeVisible();
  });

  it('drops the old rows while a new search is pending', async () => {
    await search(flag({ stage: 'beta' }));
    get.mockImplementation(() => new Promise(() => undefined));
    fireEvent.change(screen.getByTestId('flag-people-query'), {
      target: { value: 'ana' },
    });
    expect(screen.queryByTestId('flag-people-result-u-ana')).toBeNull();
  });

  it('goes back to the panel', async () => {
    const drawer = await search(flag());
    fireEvent.click(within(drawer).getByRole('button', { name: 'Back' }));
    expect(screen.queryByTestId('flag-people-search')).toBeNull();
    expect(within(drawer).getByText('Who sees it on staging')).toBeVisible();
  });
});
