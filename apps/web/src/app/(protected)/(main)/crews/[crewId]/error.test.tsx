// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import CrewError from './error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/crews/abc',
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  useClerk: () => ({ signOut: vi.fn() }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => true,
}));

afterEach(cleanup);

describe('CrewError', () => {
  // The crew home boundary catches before the app one, so it has to carry the
  // report itself or a crew page failure could never be told to us.
  it('offers a signed-in member the way to tell us what happened', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }),
    });
    render(<CrewError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.getByTestId('error-tell-us-card')).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: CONSUMER_COPY.errorReport.card.heading,
      }),
    ).toBeTruthy();
  });

  // The drawn in-app board (addendum-2 18-error-page/error-in-app-m) is a crew
  // page: the app header stands where the logo bar was, never a second one
  // under it.
  it('renders the in-app error page, with no logo bar of its own', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<CrewError error={new Error('x')} reset={vi.fn()} />);
    const page = screen.getByTestId('standalone-error');
    expect(page.getAttribute('data-in-app')).toBe('true');
    expect(page.querySelector('header')).toBeNull();
    expect(
      screen.queryByRole('link', { name: CONSUMER_COPY.error.homeLinkLabel }),
    ).toBeNull();
  });
});
