// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CARD_EDGE_FALLBACK_CSS } from '@/components/consumer/error-report/ErrorTellUsCard';
import GlobalError from './global-error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => false,
}));

const copy = CONSUMER_COPY.error;

const setClientUat = (value: string | null) => {
  document.cookie =
    value === null
      ? '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      : `__client_uat=${value}`;
};

beforeEach(() => {
  // React warns about <html> inside a div in the test container; the shape is
  // what Next requires of a global-error file.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  setClientUat(null);
});

const renderPage = () =>
  render(
    <GlobalError
      error={Object.assign(new Error('boom'), { digest: '4471' })}
      reset={vi.fn()}
    />,
  );

describe('global-error', () => {
  it('renders the standalone error page with the digest as the error ID', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: copy.errorHeading }),
    ).toBeTruthy();
    expect(screen.getByText('4471')).toBeTruthy();
  });

  // globals.css is not loaded here, so this page (and only this page) carries
  // the card's sheet-edge fallback.
  it('injects the Tell us card edge fallback itself', () => {
    renderPage();
    // The whole document: React may hoist <html>/<head> out of the container.
    const css = Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent)
      .join('\n');
    expect(css).toContain(CARD_EDGE_FALLBACK_CSS);
  });

  // No ClerkProvider here: Clerk's `__client_uat` cookie decides (addendum-2
  // §18). It is `0` when signed out, not absent.
  it.each([
    ['missing', null],
    ['0', '0'],
    ['not a number', 'abc'],
  ])(
    'signed out when __client_uat is %s: no card, Go home',
    (_label, value) => {
      setClientUat(value);
      renderPage();

      expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
      expect(
        screen.getByRole('link', { name: copy.goHomeButton }),
      ).toBeTruthy();
      expect(screen.getByText(copy.signedOutBody)).toBeTruthy();
    },
  );

  it('signed in when __client_uat is a sign-in time: the card, Go home, and no "sign out and back in"', () => {
    setClientUat('1700000000');
    renderPage();

    expect(screen.getByTestId('error-tell-us-card')).toBeTruthy();
    // addendum-3 B20a: Go home, not Sign out, so the body must not name Sign out.
    expect(screen.getByRole('link', { name: copy.goHomeButton })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: copy.signOutButton }),
    ).toBeNull();
    expect(screen.getByText(copy.signedOutBody)).toBeTruthy();
    expect(screen.queryByText(copy.errorBody)).toBeNull();
  });
});
