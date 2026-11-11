// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { InviteCode } from '@concert-crawl/types';

const { requireAdminUser, getCodes, getVenues } = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getCodes: vi.fn(),
  getVenues: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminUser,
  auth: async () => ({ getToken: async () => 'token' }),
}));
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (path: string) =>
      path === '/v1/venues' ? getVenues() : getCodes(path),
  },
}));
vi.mock('./poster.css', () => ({}));

import InviteCodePostersPage from './page';

const code = (overrides: Partial<InviteCode> = {}): InviteCode => ({
  id: 'code-1',
  code: 'BETA-AB12-CD34',
  createdBy: 'user_admin',
  usedBy: null,
  usedAt: null,
  expiresAt: null,
  revokedAt: null,
  revokedBy: null,
  createdAt: '2026-11-10T00:00:00Z',
  maxUses: 50,
  useCount: 3,
  label: 'Hi-Dive bathroom',
  ...overrides,
});

const renderPage = async (query: Record<string, string> = {}) =>
  render(
    (await InviteCodePostersPage({ searchParams: Promise.resolve(query) }))!,
  );

describe('Posters tab page', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://concertcrawl.app');
    requireAdminUser.mockResolvedValue({ userId: 'user_admin' });
    getVenues.mockResolvedValue([
      { name: 'Hi-Dive', upcomingCount: 40, featured: false },
      { name: 'Dark Room', upcomingCount: 0, featured: false },
    ]);
    getCodes.mockResolvedValue([
      code(),
      code({
        id: 'code-2',
        code: 'BETA-FULL-0000',
        label: 'Larimer wall',
        useCount: 50,
        createdAt: '2026-11-09T00:00:00Z',
      }),
      code({ id: 'code-3', code: 'BETA-SOLO-0000', maxUses: 1, useCount: 0 }),
      code({ id: 'code-4', revokedAt: '2026-11-09T00:00:00Z' }),
      code({ id: 'code-5', expiresAt: '2026-01-01T00:00:00Z' }),
    ]);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('lists live multi-seat codes, full ones faded, personal ones left out', async () => {
    await renderPage();
    const cards = screen.getAllByTestId('poster-code-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('3 of 50 seats taken');
    expect(cards[0]).toHaveTextContent('Never expires');
    expect(cards[1]).toHaveAttribute('data-full', 'true');
    expect(cards[1]).toHaveTextContent(
      'Every seat is taken. Mint a new code to put up another poster.',
    );
    expect(screen.queryByText('BETA-SOLO-0000')).toBeNull();
    expect(screen.getByText(/Personal codes \(1 seat\)/)).toBeInTheDocument();
  });

  it('previews the selected code with the crawled venue count', async () => {
    await renderPage({ code: 'code-1', look: 'paper', tabs: '1' });
    const sheet = screen.getByTestId('poster-sheet');
    expect(sheet).toHaveAttribute(
      'data-url',
      'HTTPS://CONCERTCRAWL.APP/I/BETA-AB12-CD34',
    );
    expect(sheet).toHaveAttribute('data-look', 'paper');
    expect(sheet).toHaveAttribute('data-tabs', 'true');
    expect(sheet).toHaveTextContent('We check 1 venue calendar every night');
    expect(screen.getByTestId('poster-preview-spec')).toHaveTextContent(
      'QR 3.5 in · scans from about 6 ft',
    );
  });

  it('gates on admin before reading any code', async () => {
    requireAdminUser.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getCodes).not.toHaveBeenCalled();
  });
});
