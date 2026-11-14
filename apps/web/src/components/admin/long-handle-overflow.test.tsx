// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminSheet } from './primitives/AdminSheet';
import { SidePanel } from './primitives/SidePanel';
import { RejectPriceDialog } from './prices/RejectPriceDialog';
import type { SubmittedRow } from './prices/submitted-api';
import { PhoneUserMenu } from './shell/AdminUserMenu';

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

// Style contract only: jsdom has no layout, so these pin the inline styles
// that keep a 47-character handle inside its row; they cannot measure it.
const HANDLE = 'seededHandle_kytb4nowz6gyuidj1rwoovt7j8c5h4bjqq05da9n';
const BYLINE = `Personal · @${HANDLE}`;

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

describe('a long handle stays inside its container', () => {
  it('wraps the desktop side panel byline anywhere', () => {
    render(
      <SidePanel title="CODE" subtitle={BYLINE} onClose={vi.fn()}>
        <p>body</p>
      </SidePanel>,
    );
    expect(screen.getByText(BYLINE).style.overflowWrap).toBe('anywhere');
  });

  it('wraps the phone sheet byline anywhere', () => {
    render(
      <AdminSheet title="CODE" subtitle={BYLINE} onClose={vi.fn()}>
        <p>body</p>
      </AdminSheet>,
    );
    expect(screen.getByText(BYLINE).style.overflowWrap).toBe('anywhere');
  });

  it('wraps the reject dialog sentence that names the fan', () => {
    const row: SubmittedRow = {
      id: 'sub-1',
      eventId: 'ev-1',
      title: 'Ninth Key',
      venueName: 'Bluebird',
      date: '2026-11-20',
      priceMin: '25.00',
      priceMax: null,
      handle: HANDLE,
      avatarColor: null,
      avatarSecondColor: null,
      backedBy: 0,
      state: 'waiting',
      ticketUrl: null,
    };
    render(
      <RejectPriceDialog row={row} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const body = ADMIN_COPY.pricesSubmitted.reject.body(HANDLE);
    expect(screen.getByText(body).style.overflowWrap).toBe('anywhere');
  });

  it('ends the phone account sheet name in an ellipsis', () => {
    render(
      <PhoneUserMenu
        user={{ firstName: null, handle: HANDLE, email: 'a@b.c' }}
      />,
    );
    fireEvent.click(screen.getByTestId('admin-user-menu-trigger'));
    const name = screen.getByTestId('admin-user-menu-name');
    expect(name).toHaveTextContent(`@${HANDLE}`);
    expect(name.style.minWidth).toBe('0px');
    expect(name.style.overflow).toBe('hidden');
    expect(name.style.textOverflow).toBe('ellipsis');
    expect(name.style.whiteSpace).toBe('nowrap');
  });
});
