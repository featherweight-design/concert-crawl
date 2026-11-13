// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { NOTIFICATIONS_COPY } from './definitions/copy';

const routerPush = vi.fn();
const routerBack = vi.fn();
const routerReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    back: routerBack,
    replace: routerReplace,
  }),
}));

// The panel is covered by the account-menu tests; here it is only the `‹ Menu`
// row the page wires.
vi.mock('./NotifMenuPanel', () => ({
  NotifMenuPanel: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      {NOTIFICATIONS_COPY.menuBack}
    </button>
  ),
}));

import { NotificationsPage } from './NotificationsPage';

function setWide(wide: boolean): void {
  window.matchMedia = (query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  setWide(false);
});

afterEach(cleanup);

const renderPage = async (): Promise<void> => {
  await act(async () => {
    render(<NotificationsPage />);
  });
};

const pressBack = async (): Promise<void> => {
  await act(async () => {
    screen.getByRole('button', { name: NOTIFICATIONS_COPY.menuBack }).click();
  });
};

describe('NotificationsPage (phone)', () => {
  it('goes back in history when the account menu pushed it, and asks for the menu', async () => {
    sessionStorage.setItem('cc_notifs_from_menu', '1');
    await renderPage();
    await pressBack();

    expect(routerBack).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('cc_reopen_account_menu')).toBe('1');
  });

  it('goes to Browse on a deep link, still asking for the menu', async () => {
    await renderPage();
    await pressBack();

    expect(routerBack).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith('/events');
    expect(sessionStorage.getItem('cc_reopen_account_menu')).toBe('1');
  });

  it('takes the from-menu flag, so a later visit is not treated as in-app', async () => {
    sessionStorage.setItem('cc_notifs_from_menu', '1');
    await renderPage();

    expect(sessionStorage.getItem('cc_notifs_from_menu')).toBeNull();
  });

  it('does not redirect a phone-width visit', async () => {
    await renderPage();

    expect(routerReplace).not.toHaveBeenCalled();
  });
});

describe('NotificationsPage (wide)', () => {
  it('hands over to Browse with the popover asked to open', async () => {
    setWide(true);
    await renderPage();

    expect(routerReplace).toHaveBeenCalledWith('/events');
    expect(sessionStorage.getItem('cc_reopen_account_menu')).toBe('1');
  });
});
