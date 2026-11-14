// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import MainError from './error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/events',
}));
const auth = { isLoaded: true, isSignedIn: true };
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => auth,
  useClerk: () => ({ signOut: vi.fn() }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => true,
}));

beforeEach(() => {
  auth.isLoaded = true;
  auth.isSignedIn = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('(main) error boundary (addendum-2 §18, error-in-app-m)', () => {
  it('renders the in-app error page: no logo bar of its own, so the app header stands in', () => {
    const error = Object.assign(new Error('x'), { digest: '2849204133' });
    render(<MainError error={error} reset={vi.fn()} />);

    const page = screen.getByTestId('standalone-error');
    expect(page.getAttribute('data-in-app')).toBe('true');
    expect(page.querySelector('header')).toBeNull();
    expect(page.getAttribute('style') ?? '').not.toContain('100dvh');
  });

  it('carries the standalone page’s error, Tell us card and error ID', () => {
    const error = Object.assign(new Error('x'), { digest: '2849204133' });
    render(<MainError error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: CONSUMER_COPY.error.errorHeading }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: CONSUMER_COPY.error.signOutButton }),
    ).toBeTruthy();
    expect(screen.getByTestId('error-tell-us-card')).toBeTruthy();
    expect(screen.getByText('2849204133')).toBeTruthy();
  });

  // Behind the protected layout: signed in until Clerk answers (it can be
  // slow, or blocked by Brave Shields).
  it('while Clerk is still loading: the card and Sign out', () => {
    auth.isLoaded = false;
    auth.isSignedIn = false;
    render(<MainError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.getByTestId('error-tell-us-card')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: CONSUMER_COPY.error.signOutButton }),
    ).toBeTruthy();
  });

  it('once Clerk says signed out: no card, Go home', () => {
    auth.isSignedIn = false;
    render(<MainError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
    expect(
      screen.getByRole('link', { name: CONSUMER_COPY.error.goHomeButton }),
    ).toBeTruthy();
  });
});
