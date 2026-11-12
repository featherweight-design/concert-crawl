// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { STANDALONE_ERROR_COPY } from '@/components/consumer/standalone-error/definitions/copy';
import MainError from './error';

const signOut = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => true,
}));

afterEach(() => {
  cleanup();
  signOut.mockClear();
  document.cookie = '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('MainError, the in-app route boundary', () => {
  // Addendum 2 item 18, `error-in-app-m`: the standalone page's error, Tell us
  // card and error ID, with with the app header and bottom nav kept.
  it('shows a signed-in visitor the standalone error, Sign out and the Tell us card', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    document.cookie = '__client_uat=1731300000';
    render(<MainError error={new Error('x')} reset={vi.fn()} />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: STANDALONE_ERROR_COPY.heading,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(STANDALONE_ERROR_COPY.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(STANDALONE_ERROR_COPY.body)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: STANDALONE_ERROR_COPY.signOut }),
    );
    expect(signOut).toHaveBeenCalled();
  });

  // Inside the app shell: the app header and bottom nav stay, so the page
  // drops its own logo and full height.
  it('renders embedded, without a second logo', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <MainError error={new Error('x')} reset={vi.fn()} />,
    );
    expect(container.querySelector('.cc-err-embedded')).not.toBeNull();
    expect(container.querySelector('.cc-err-logo')).toBeNull();
  });
});
