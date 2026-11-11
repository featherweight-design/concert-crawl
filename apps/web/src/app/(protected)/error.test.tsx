// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { STANDALONE_ERROR_COPY } from '@/components/consumer/standalone-error/definitions/copy';
import ProtectedError from './error';

const captureException = vi.fn(
  (_error: unknown, _hint: { tags: Record<string, string> }) => 'evt123',
);
vi.mock('@sentry/nextjs', () => ({
  captureException: (error: unknown, hint: { tags: Record<string, string> }) =>
    captureException(error, hint),
}));

const signOut = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({ signOut }),
}));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

beforeEach(() => {
  captureException.mockClear();
  signOut.mockClear();
  refresh.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.cookie = '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('ProtectedError', () => {
  it('files a browser throw to Sentry once, tagged with the id it shows', () => {
    // A retry that throws the same error mounts the boundary afresh, which
    // re-runs its effect; only the cache keeps that to one event and one id.
    const error = new Error('boom');
    const first = render(<ProtectedError error={error} reset={vi.fn()} />);
    first.unmount();
    render(<ProtectedError error={error} reset={vi.fn()} />);

    expect(captureException).toHaveBeenCalledTimes(1);
    const errorId = captureException.mock.calls[0]?.[1].tags['error_id'];
    expect(errorId).toMatch(/^\d{10}$/);
    expect(screen.getByText(errorId!)).toBeInTheDocument();
  });

  it('leaves a server throw to onRequestError and shows its digest', () => {
    const error = Object.assign(new Error('server'), { digest: '42' });
    render(<ProtectedError error={error} reset={vi.fn()} />);
    expect(captureException).not.toHaveBeenCalled();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('mints an id for a digest of a shape a report cannot carry', () => {
    const odd = Object.assign(new Error('lib'), { digest: 'NEXT:REDIRECT;x' });
    render(<ProtectedError error={odd} reset={vi.fn()} />);
    expect(screen.queryByText('NEXT:REDIRECT;x')).toBeNull();
  });

  it('retries by refreshing the payload and resetting', () => {
    const reset = vi.fn();
    render(<ProtectedError error={new Error('x')} reset={reset} />);
    fireEvent.click(
      screen.getByRole('button', { name: STANDALONE_ERROR_COPY.tryAgain }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });

  it('offers a signed-in visitor sign out and the Tell us card', () => {
    document.cookie = '__client_uat=1731300000';
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: STANDALONE_ERROR_COPY.signOut }),
    );
    expect(signOut).toHaveBeenCalled();
  });
});
