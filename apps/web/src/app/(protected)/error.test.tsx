// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import ProtectedError from './error';

const captureException = vi.fn((_error: unknown) => 'evt123');
vi.mock('@sentry/nextjs', () => ({
  captureException: (error: unknown) => captureException(error),
  isEnabled: () => sentryEnabled.current,
}));
const sentryEnabled = { current: true };

const auth = { isLoaded: true, isSignedIn: true };
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => auth,
  useClerk: () => ({ signOut: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/crews',
}));

const fetchMock = vi.fn(async (_url: string, _init: { body: string }) => ({
  ok: true,
}));

beforeEach(() => {
  captureException.mockClear();
  sentryEnabled.current = true;
  fetchMock.mockClear();
  auth.isLoaded = true;
  auth.isSignedIn = true;
  localStorage.clear();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const CARD = CONSUMER_COPY.errorReport.card;

const sendWith = (chip: string, note?: string) => {
  fireEvent.click(screen.getByRole('radio', { name: chip }));
  if (note !== undefined) {
    fireEvent.change(screen.getByLabelText(CARD.noteLabel), {
      target: { value: note },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: `${CARD.send} →` }));
};

describe('ProtectedError', () => {
  it('reports a browser throw to Sentry once, however often it mounts', () => {
    // A retry that throws the same error mounts the boundary afresh, which
    // re-runs its effect; only the cache keeps that to one event.
    const error = new Error('boom');
    const first = render(<ProtectedError error={error} reset={vi.fn()} />);
    first.unmount();
    render(<ProtectedError error={error} reset={vi.fn()} />);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('leaves a server throw to onRequestError', () => {
    const error = Object.assign(new Error('server'), { digest: '42' });
    render(<ProtectedError error={error} reset={vi.fn()} />);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('hides the Tell us card from a signed-out visitor', () => {
    auth.isSignedIn = false;
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
  });

  // A protected route: assume signed in until Clerk answers (it can be slow,
  // or blocked by Brave Shields); a 401 on send switches the layout itself.
  it('while Clerk is still loading: the signed-in page, card and Sign out', () => {
    auth.isLoaded = false;
    auth.isSignedIn = false;
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.getByTestId('error-tell-us-card')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: CONSUMER_COPY.error.signOutButton }),
    ).toBeTruthy();
  });

  it('files the report with the chip, the note and the browser throw’s event id', async () => {
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    sendWith('Opening a show', 'Blank page');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(init?.body ?? '{}')).toMatchObject({
      category: 'bug',
      message: 'Opening a show. Blank page',
      pageUrl: '/crews',
      metadata: {
        source: 'error',
        doing: 'Opening a show',
        sentryEventId: 'evt123',
      },
    });
    expect(
      await screen.findByRole('heading', { name: CARD.sentHeading }),
    ).toBeTruthy();
  });

  it('one tap is a complete report: the chip alone, no note', async () => {
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    sendWith('Searching');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? '{}'),
    ).toMatchObject({ message: 'Searching', metadata: { doing: 'Searching' } });
  });

  it('records no event id when Sentry is off, so none points nowhere', async () => {
    sentryEnabled.current = false;
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    sendWith('Searching');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]?.body).not.toContain('sentryEventId');
  });

  it('carries a server throw by its digest, and an id of another shape not at all', async () => {
    const error = Object.assign(new Error('server'), { digest: '4242' });
    render(<ProtectedError error={error} reset={vi.fn()} />);
    sendWith('Searching');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? '{}'),
    ).toMatchObject({
      metadata: { digest: '4242' },
    });

    cleanup();
    fetchMock.mockClear();
    const odd = Object.assign(new Error('lib'), { digest: 'NEXT:REDIRECT;x' });
    render(<ProtectedError error={odd} reset={vi.fn()} />);
    sendWith('Searching');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]?.body).not.toContain('digest');
  });
});
