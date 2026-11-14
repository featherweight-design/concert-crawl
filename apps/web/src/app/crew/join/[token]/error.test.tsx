// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
  usePathname: () => '/crew/join/secret-invite-token',
}));

import CrewJoinError from './error';

const copy = CONSUMER_COPY.error;
const card = CONSUMER_COPY.errorReport.card;

// An invite is often opened signed out.
const session = { isLoaded: true, isSignedIn: false };
const signOut = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => session,
  useClerk: () => ({ signOut }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => true,
}));

afterEach(() => {
  cleanup();
  session.isLoaded = true;
  session.isSignedIn = false;
  vi.unstubAllGlobals();
});
beforeEach(() => {
  refresh.mockReset();
  signOut.mockReset();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('crew join error boundary', () => {
  // A public route: while Clerk is still loading (or blocked), signed out.
  it('Clerk not loaded yet: the signed-out layout, no card', () => {
    session.isLoaded = false;
    render(<CrewJoinError error={new Error('x')} reset={vi.fn()} />);

    expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
    expect(
      screen.getByRole('link', { name: copy.goHomeButton }),
    ).toBeInTheDocument();
  });

  it('signed out: the bare error page, no card, no Sign out, Go home', () => {
    const reset = vi.fn();
    render(
      <CrewJoinError
        error={Object.assign(new Error('boom'), { digest: '4471' })}
        reset={reset}
      />,
    );

    expect(
      screen.getByRole('heading', { name: copy.errorHeading }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('standalone-error')).toBeInTheDocument();
    expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
    expect(
      screen.queryByRole('button', { name: copy.signOutButton }),
    ).toBeNull();
    expect(screen.getByText(copy.signedOutBody)).toBeInTheDocument();
    expect(screen.queryByText(copy.errorBody)).toBeNull();
    expect(
      screen.getByRole('link', { name: copy.goHomeButton }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByText('4471')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: copy.tryAgainButton }));
    // Both halves: `reset()` alone re-renders against the same cached, failed
    // RSC payload and lands straight back here.
    expect(refresh).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });

  it('signed in: the Tell us card and Sign out, as (protected)/error.tsx draws', () => {
    session.isSignedIn = true;
    render(<CrewJoinError error={new Error('x')} reset={vi.fn()} />);

    expect(screen.getByTestId('error-tell-us-card')).toBeInTheDocument();
    expect(screen.getByText(copy.errorBody)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.signOutButton }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  // The landing's path carries the invite token, a capability. A report filed
  // from here must never store it.
  it('files a report from the invite landing without the token', async () => {
    session.isSignedIn = true;
    const fetchMock = vi.fn(async (_url: string, _init: { body: string }) => ({
      ok: true,
      type: 'basic',
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<CrewJoinError error={new Error('x')} reset={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Searching' }));
    fireEvent.click(screen.getByRole('button', { name: `${card.send} →` }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = fetchMock.mock.calls[0]?.[1]?.body ?? '';
    expect(body).not.toContain('secret-invite-token');
  });
});
