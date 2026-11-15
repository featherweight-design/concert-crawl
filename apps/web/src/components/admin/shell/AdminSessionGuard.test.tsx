// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { adminFetch, apiClient } from '@/lib/api';
import { AdminSessionGuard } from './AdminSessionGuard';

const clerk = vi.hoisted(() => ({
  auth: {
    isLoaded: true,
    isSignedIn: true,
    getToken: vi.fn(),
  },
  openSignIn: vi.fn(),
  // Clerk's state-change listener: the test fires it to mimic a sign-in.
  listeners: new Set<() => void>(),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => clerk.auth,
  useClerk: () => ({
    openSignIn: clerk.openSignIn,
    addListener: (listener: () => void) => {
      clerk.listeners.add(listener);
      return () => clerk.listeners.delete(listener);
    },
  }),
}));

const overlay = () => screen.queryByTestId('admin-signed-out-overlay');

const answer401 = async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', { status: 401 })),
  );
  await act(async () => {
    await adminFetch('/api/admin/x');
  });
};

describe('AdminSessionGuard', () => {
  beforeEach(() => {
    clerk.auth.isLoaded = true;
    clerk.auth.isSignedIn = true;
    clerk.auth.getToken = vi.fn().mockResolvedValue('token');
    clerk.openSignIn.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows nothing while the session is live', () => {
    render(<AdminSessionGuard />);
    expect(overlay()).toBeNull();
  });

  it('shows the overlay when Clerk says the session ended, and clears it when they are back', () => {
    const { rerender } = render(<AdminSessionGuard />);
    clerk.auth.isSignedIn = false;
    rerender(<AdminSessionGuard />);
    expect(overlay()).toBeInTheDocument();
    clerk.auth.isSignedIn = true;
    rerender(<AdminSessionGuard />);
    expect(overlay()).toBeNull();
  });

  it('does not treat a page that loads signed out as a session that ended', () => {
    clerk.auth.isLoaded = false;
    clerk.auth.isSignedIn = false;
    const { rerender } = render(<AdminSessionGuard />);
    clerk.auth.isLoaded = true;
    rerender(<AdminSessionGuard />);
    expect(overlay()).toBeNull();
  });

  it('shows it on a 401 when Clerk cannot hand out a token', async () => {
    clerk.auth.getToken = vi.fn().mockResolvedValue(null);
    render(<AdminSessionGuard />);
    await answer401();
    await waitFor(() => expect(overlay()).toBeInTheDocument());
    expect(clerk.auth.getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it('shows it for a 401 through apiClient too, the path nearly every admin page uses', async () => {
    clerk.auth.getToken = vi.fn().mockResolvedValue(null);
    render(<AdminSessionGuard />);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          {
            status: 401,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );
    await act(async () => {
      await apiClient
        .get('/v1/admin/venues', 'stale-token')
        .catch(() => undefined);
    });
    await waitFor(() => expect(overlay()).toBeInTheDocument());
  });

  it('clears an overlay a 401 raised on a still-signed-in session once Clerk reports a token again', async () => {
    clerk.auth.getToken = vi.fn().mockResolvedValue(null);
    const { rerender } = render(<AdminSessionGuard />);
    await answer401();
    await waitFor(() => expect(overlay()).toBeInTheDocument());
    // The admin signs in again in Clerk's modal: isSignedIn never changed, but
    // Clerk hands the component a new getToken, which is what a re-render is.
    clerk.auth.getToken = vi.fn().mockResolvedValue('fresh-token');
    rerender(<AdminSessionGuard />);
    await act(async () => {
      for (const listener of clerk.listeners) listener();
    });
    await waitFor(() => expect(overlay()).toBeNull());
  });

  it('asks Clerk for a fresh token once for a burst of 401s, not once per response', async () => {
    render(<AdminSessionGuard />);
    await answer401();
    await waitFor(() => expect(clerk.auth.getToken).toHaveBeenCalledTimes(1));
    await answer401();
    await answer401();
    expect(clerk.auth.getToken).toHaveBeenCalledTimes(1);
  });

  it('leaves a 401 with a live token to the page: a role problem, not a session end', async () => {
    render(<AdminSessionGuard />);
    await answer401();
    await waitFor(() => expect(clerk.auth.getToken).toHaveBeenCalled());
    expect(overlay()).toBeNull();
  });

  it('does not take a failed token refresh (the network) for a session end', async () => {
    clerk.auth.getToken = vi.fn().mockRejectedValue(new Error('offline'));
    render(<AdminSessionGuard />);
    await answer401();
    await waitFor(() => expect(clerk.auth.getToken).toHaveBeenCalled());
    expect(overlay()).toBeNull();
  });

  it('opens Clerk sign-in as a modal that returns to this page, without navigating', () => {
    const { rerender } = render(<AdminSessionGuard />);
    clerk.auth.isSignedIn = false;
    rerender(<AdminSessionGuard />);
    fireEvent.click(screen.getByRole('button'));
    expect(clerk.openSignIn).toHaveBeenCalledWith({
      fallbackRedirectUrl: window.location.href,
    });
  });
});
