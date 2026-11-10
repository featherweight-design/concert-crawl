// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import CrewError from './error';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/crews/abc',
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true, getToken: async () => 'token' }),
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
    expect(screen.getByText(CONSUMER_COPY.error.reportLink)).toBeTruthy();
  });
});
