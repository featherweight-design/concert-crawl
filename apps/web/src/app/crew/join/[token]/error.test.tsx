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
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => '/crew/join/secret-invite-token',
}));

import CrewJoinError from './error';
import { CREWS_COPY } from '@/components/consumer/crews';

// The boundary's report link reads the session; a signed-out visitor sees none.
const session = { isSignedIn: false, getToken: async () => 'token' };
vi.mock('@clerk/nextjs', () => ({ useAuth: () => session }));
vi.mock('@sentry/nextjs', () => ({
  captureException: () => 'evt',
  isEnabled: () => true,
}));

afterEach(cleanup);
beforeEach(() => {
  refresh.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('crew join error boundary (#1226)', () => {
  it('states the failure as ours and offers both a retry and a way out', () => {
    const reset = vi.fn();
    render(<CrewJoinError error={new Error('boom')} reset={reset} />);

    expect(
      screen.getByText(CREWS_COPY.net.errInviteEyebrow),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: CREWS_COPY.net.errInviteTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(CREWS_COPY.net.errInviteBody)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: CREWS_COPY.linkDead.browse }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: CREWS_COPY.net.retry }));
    // Both halves: `reset()` alone re-renders against the same cached, failed
    // RSC payload and lands straight back here.
    expect(refresh).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });

  // The landing's path carries the invite token, a capability. A report filed
  // from here must never store it.
  it('files a report from the invite landing without the token', async () => {
    session.isSignedIn = true;
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
    const fetchMock = vi.fn(async (_url: string, _init: { body: string }) => ({
      ok: true,
    }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      render(<CrewJoinError error={new Error('x')} reset={vi.fn()} />);
      fireEvent.click(screen.getByText(CONSUMER_COPY.error.reportLink));
      fireEvent.change(screen.getAllByRole('textbox')[0]!, {
        target: { value: 'Blank' },
      });
      fireEvent.click(screen.getAllByText(CONSUMER_COPY.errorReport.send)[0]!);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const body = fetchMock.mock.calls[0]?.[1]?.body ?? '';
      expect(body).not.toContain('secret-invite-token');
    } finally {
      session.isSignedIn = false;
      vi.unstubAllGlobals();
    }
  });
});
