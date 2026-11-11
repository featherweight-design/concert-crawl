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
import { STANDALONE_ERROR_COPY } from '@/components/consumer/standalone-error/definitions/copy';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

import CrewJoinError from './error';
import { CREWS_COPY } from '@/components/consumer/crews';

vi.mock('@sentry/nextjs', () => ({ captureException: () => 'evt' }));

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
      screen.getByRole('link', { name: STANDALONE_ERROR_COPY.goHome }),
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
    window.history.replaceState(null, '', '/crew/join/secret-invite-token');
    document.cookie = '__client_uat=1731300000';
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(null, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      render(<CrewJoinError error={new Error('x')} reset={vi.fn()} />);
      fireEvent.click(
        screen.getByRole('radio', {
          name: STANDALONE_ERROR_COPY.card.doing.other,
        }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: STANDALONE_ERROR_COPY.card.send }),
      );
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      const body = String(fetchMock.mock.calls[0]?.[1]?.body ?? '');
      expect(body).not.toContain('secret-invite-token');
    } finally {
      document.cookie = '__client_uat=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      vi.unstubAllGlobals();
    }
  });
});
