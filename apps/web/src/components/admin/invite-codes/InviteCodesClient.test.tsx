// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InviteCodesClient } from './InviteCodesClient';

const { getTokenMock } = vi.hoisted(() => ({
  getTokenMock: async () => 'token',
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: getTokenMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/** One list row as the API sends it; `kind` is whatever the test passes. */
const wireRow = (over: Record<string, unknown>) => ({
  id: '00000000-0000-4000-8000-000000000001',
  code: 'REDROCKS',
  createdBy: 'user_1',
  usedBy: null,
  usedAt: null,
  expiresAt: null,
  revokedAt: null,
  revokedBy: null,
  createdAt: '2026-10-01T18:00:00Z',
  maxUses: 50,
  useCount: 3,
  label: 'Red Rocks lot',
  kind: 'admin',
  createdByHandle: 'jules',
  lastUsedAt: null,
  ...over,
});

const ROWS = [
  wireRow({}),
  wireRow({
    id: '00000000-0000-4000-8000-000000000002',
    code: 'SHEETMEMBER01',
    label: null,
    maxUses: 10_000,
    useCount: 4,
    kind: 'member',
    createdByHandle: 'hugh',
  }),
  wireRow({
    id: '00000000-0000-4000-8000-000000000003',
    code: 'VENUEDOOR',
    label: 'Front door',
    kind: 'venue',
  }),
];

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
        ? json({ success: true, data: { total: 2 } })
        : json({ success: true, data: ROWS }),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The open menu's items by their first line, e.g. "Revoke…". */
const menuLabels = (): string[] =>
  screen
    .getAllByRole('menuitem')
    .map((item) => item.textContent ?? '')
    .map(
      (text) =>
        [
          'Copy link',
          'Make a poster',
          'See who joined',
          'Edit…',
          'Revoke…',
          'Reactivate…',
        ].find((label) => text.startsWith(label)) ?? text,
    );

const openMenu = async (code: string) => {
  fireEvent.click(
    await screen.findByRole('button', { name: `Actions for ${code}` }),
  );
};

describe('InviteCodesClient row menu', () => {
  it('offers a member row Copy, See who joined and Revoke, never Edit', async () => {
    render(<InviteCodesClient origin="https://concertcrawl.app" />);
    await openMenu('SHEETMEMBER01');
    expect(menuLabels()).toEqual(['Copy link', 'See who joined', 'Revoke…']);
  });

  it('still offers an admin row Edit', async () => {
    render(<InviteCodesClient origin="https://concertcrawl.app" />);
    await openMenu('REDROCKS');
    expect(menuLabels()).toContain('Edit…');
  });

  it('keeps a row of an unknown kind, read-only, with its plain label', async () => {
    render(<InviteCodesClient origin="https://concertcrawl.app" />);
    // The list loads rather than failing into Couldn't load.
    expect(await screen.findByText('VENUEDOOR')).toBeInTheDocument();
    expect(screen.getByText('Front door')).toBeInTheDocument();
    expect(screen.queryByText('Poster · Front door')).not.toBeInTheDocument();
    await openMenu('VENUEDOOR');
    expect(menuLabels()).toEqual(['Copy link', 'See who joined', 'Revoke…']);
  });

  it('labels the member row and draws its seats without the cap', async () => {
    render(<InviteCodesClient origin="https://concertcrawl.app" />);
    expect(await screen.findByText('Personal · @hugh')).toBeInTheDocument();
    expect(screen.getByText('4 joined')).toBeInTheDocument();
    expect(screen.queryByText(/of 10,?000/)).not.toBeInTheDocument();
  });
});

describe('InviteCodesClient phone list', () => {
  it('ends a long handle in an ellipsis inside the row', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<InviteCodesClient origin="https://concertcrawl.app" />);
    await screen.findByText('Personal · @hugh');
    const label = screen
      .getAllByTestId('invite-code-row-label')
      .find((node) => node.textContent === 'Personal · @hugh');
    expect(label?.style.minWidth).toBe('0px');
    expect(label?.style.overflow).toBe('hidden');
    expect(label?.style.textOverflow).toBe('ellipsis');
    expect(label?.style.whiteSpace).toBe('nowrap');
  });
});
