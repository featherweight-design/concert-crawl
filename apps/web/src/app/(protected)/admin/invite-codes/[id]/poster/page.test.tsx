// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { InviteCode } from '@concert-crawl/types';

const { requireAdminUser, getCodes } = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getCodes: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminUser,
  auth: async () => ({ getToken: async () => 'token' }),
}));
vi.mock('@/lib/api', () => ({ apiClient: { get: getCodes } }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('./poster.css', () => ({}));

import InviteCodePosterPage from './page';

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

const renderPage = async (id = 'code-1') =>
  render(await InviteCodePosterPage({ params: Promise.resolve({ id }) }));

describe('invite code poster page', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://concertcrawl.app');
    requireAdminUser.mockResolvedValue({ userId: 'user_admin' });
    getCodes.mockResolvedValue([code()]);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('draws the QR, the code and the typed address on the sheet', async () => {
    await renderPage();

    const sheet = screen.getByTestId('poster-sheet');
    expect(sheet).toHaveAttribute(
      'data-url',
      'HTTPS://CONCERTCRAWL.APP/I/BETA-AB12-CD34',
    );
    expect(
      screen.getByRole('img', { name: /BETA-AB12-CD34/ }).querySelector('path'),
    ).toHaveAttribute('d', expect.stringMatching(/^M\d+ \d+h1v1h-1z/));
    expect(screen.getByTestId('poster-code')).toHaveTextContent(
      'BETA-AB12-CD34',
    );
    expect(screen.getByTestId('poster-typed-url')).toHaveTextContent(
      'concertcrawl.app/i',
    );
    expect(screen.getByTestId('poster-bar')).toHaveTextContent('47 seats left');
  });

  it('gates on admin before reading any code', async () => {
    requireAdminUser.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getCodes).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown', [code()], 'code-2'],
    ['revoked', [code({ revokedAt: '2026-11-09T00:00:00Z' })], 'code-1'],
    ['expired', [code({ expiresAt: '2026-01-01T00:00:00Z' })], 'code-1'],
    ['full', [code({ useCount: 50 })], 'code-1'],
    ['personal', [code({ maxUses: 1, useCount: 0 })], 'code-1'],
  ])('is a 404 for an %s code', async (_, rows, id) => {
    getCodes.mockResolvedValue(rows);
    await expect(renderPage(id)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
