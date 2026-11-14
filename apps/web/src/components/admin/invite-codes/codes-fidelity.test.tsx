// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { AdminInviteCode } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ReactivateConfirm } from './CodeConfirms';
import { InviteCodesClient } from './InviteCodesClient';

// P47-13 PR A: SH38 (07/invite-codes-none) and SH40 (07/reactivate-a-code).

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('/v1/admin/people')
        ? json({ success: true, data: { total: 0 } })
        : json({ success: true, data: [] }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const code = (over: Partial<AdminInviteCode> = {}): AdminInviteCode => ({
  id: '00000000-0000-4000-8000-000000000001',
  code: 'SHARED1',
  createdBy: 'user_1',
  usedBy: null,
  usedAt: null,
  expiresAt: null,
  revokedAt: '2026-11-02T18:00:00Z',
  revokedBy: 'user_1',
  createdAt: '2026-10-01T18:00:00Z',
  maxUses: 25,
  useCount: 4,
  label: null,
  kind: 'admin',
  createdByHandle: 'hugh',
  lastUsedAt: null,
  ...over,
});

describe('SH38: no invite codes yet (07/invite-codes-none)', () => {
  it('shows the people icon, not a ticket', async () => {
    render(<InviteCodesClient origin="https://concertcrawl.app" />);
    const empty = await screen.findByTestId('empty-state');
    expect(empty.querySelector('svg.lucide-users')).not.toBeNull();
    expect(empty.querySelector('svg.lucide-ticket')).toBeNull();
  });
});

describe('SH40: Reactivate (07/reactivate-a-code)', () => {
  const noop = () => undefined;

  it('says when it was revoked, in Mountain Time', () => {
    render(
      <ReactivateConfirm
        code={code()}
        now={new Date('2026-11-14T18:00:00Z')}
        pending={false}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(
      screen.getByText(
        'People can join with SHARED1 again, up to its 25 seats (4 used). It was revoked on Nov 2.',
      ),
    ).toBeInTheDocument();
  });

  it('says nothing about revoking for a code that only expired', () => {
    render(
      <ReactivateConfirm
        code={code({ revokedAt: null, revokedBy: null })}
        now={new Date('2026-11-14T18:00:00Z')}
        pending={false}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(
      screen.getByText(ADMIN_COPY.codesPage.reactivate.body('SHARED1', 25, 4)),
    ).toBeInTheDocument();
    expect(screen.queryByText(/revoked on/)).toBeNull();
  });
});
