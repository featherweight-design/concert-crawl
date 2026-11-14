// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { PersonClient } from './PersonClient';

// P47-13 PR C (SH26): "See their Submitted prices" in the person ⋯
// (`A3/12/person-menu-d`), after Sign them out everywhere, on both widths.

const COPY = ADMIN_COPY.personPage;

let viewerId = 'user_viewer';
// One stable function: a new one per render re-creates the API and reloads.
const getToken = async () => 'token';
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, userId: viewerId }),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  notFound: () => {
    throw new Error('notFound');
  },
}));

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const detail = (over: Record<string, unknown> = {}) => ({
  id: 'user_1',
  handle: 'mira.k',
  avatarColor: null,
  avatarSecondColor: null,
  emailMasked: 'm•••@gmail.com',
  role: 'beta',
  createdAt: '2026-10-02T18:00:00Z',
  lastActiveAt: '2026-11-14T10:00:00Z',
  isTestAccount: false,
  joinSource: null,
  founder: false,
  signInMethods: ['Google'],
  codeRedeemerCount: null,
  stats: { watching: 18, concerts: 6, submittedPrices: 4, feedback: 2 },
  recent: [],
  ...over,
});

let personBody: unknown = null;

const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  viewerId = 'user_viewer';
  push.mockReset();
  setPhone(false);
  personBody = detail();
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      url.includes('/v1/admin/people/')
        ? Promise.resolve(json({ success: true, data: personBody }))
        : Promise.resolve(json({ success: true, data: [] })),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const openMenu = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /^More for / }));

const itemNames = () =>
  screen.getAllByRole('menuitem').map((item) => item.textContent ?? '');

describe('Person ⋯: See their Submitted prices (A3/12/person-menu-d)', () => {
  it.each([false, true])(
    'comes after Sign out, with the count, and opens their filtered list (phone: %s)',
    async (phone) => {
      setPhone(phone);
      render(<PersonClient userId="user_1" />);
      await openMenu();

      const names = itemNames();
      expect(names).toHaveLength(2);
      expect(names[0]).toContain(COPY.menu.signOut);
      expect(names[1]).toContain(COPY.menu.seePrices);
      expect(names[1]).toContain('4 prices');

      fireEvent.click(
        screen.getByRole('menuitem', {
          name: new RegExp(COPY.menu.seePrices),
        }),
      );
      expect(push).toHaveBeenCalledWith(
        '/admin/prices?tab=submitted&handle=mira.k',
      );
    },
  );

  it('says "1 price" for one', async () => {
    personBody = detail({
      stats: { watching: 0, concerts: 0, submittedPrices: 1, feedback: 0 },
    });
    render(<PersonClient userId="user_1" />);
    await openMenu();
    expect(itemNames()[1]).toContain('1 price');
    expect(itemNames()[1]).not.toContain('1 prices');
  });

  it('is left out with no prices, or with no handle to filter on', async () => {
    personBody = detail({
      stats: { watching: 0, concerts: 0, submittedPrices: 0, feedback: 0 },
    });
    render(<PersonClient userId="user_1" />);
    await openMenu();
    expect(itemNames()).toHaveLength(1);
    cleanup();

    personBody = detail({ handle: null });
    render(<PersonClient userId="user_1" />);
    await openMenu();
    expect(itemNames()).toHaveLength(1);
  });

  it('your own page shows only this item, and no ⋯ without it', async () => {
    viewerId = 'user_1';
    render(<PersonClient userId="user_1" />);
    await openMenu();
    expect(itemNames()).toHaveLength(1);
    expect(itemNames()[0]).toContain(COPY.menu.seePrices);
    cleanup();

    personBody = detail({
      stats: { watching: 0, concerts: 0, submittedPrices: 0, feedback: 0 },
    });
    render(<PersonClient userId="user_1" />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: /^More for / })).toBeNull();
  });
});
