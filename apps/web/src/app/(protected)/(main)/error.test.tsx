// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import MainError from './error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/events',
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true, getToken: async () => 'token' }),
  useClerk: () => ({ signOut: vi.fn() }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => true,
}));

beforeEach(() => {
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
    expect(page.style.minHeight).toBe('');
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
});
