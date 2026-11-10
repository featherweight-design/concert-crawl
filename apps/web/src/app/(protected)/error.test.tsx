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

const auth = { isSignedIn: true, getToken: vi.fn(async () => 'token') };
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => auth,
  useClerk: () => ({ signOut: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/crews',
}));

const fetchMock = vi.fn(async (_url: string, _init: { body: string }) => ({
  ok: true,
}));

beforeEach(() => {
  // ModalShell picks sheet or dialog by viewport.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
  captureException.mockClear();
  sentryEnabled.current = true;
  fetchMock.mockClear();
  auth.isSignedIn = true;
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const COPY = CONSUMER_COPY.errorReport;

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

  it('hides the report link from a signed-out visitor', () => {
    auth.isSignedIn = false;
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.queryByText(CONSUMER_COPY.error.reportLink)).toBeNull();
  });

  it('files the report with the error id and the reporter words', async () => {
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    fireEvent.click(screen.getByText(CONSUMER_COPY.error.reportLink));

    const [what, doing] = screen.getAllByRole('textbox');
    fireEvent.change(what!, { target: { value: 'Blank page' } });
    fireEvent.change(doing!, { target: { value: 'Opening crews' } });
    fireEvent.click(screen.getAllByText(COPY.send)[0]!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(init?.body ?? '{}')).toMatchObject({
      category: 'bug',
      message: 'Blank page',
      pageUrl: '/crews',
      metadata: {
        source: 'error',
        doing: 'Opening crews',
        sentryEventId: 'evt123',
      },
    });
    await waitFor(() =>
      expect(screen.getAllByText(COPY.sentTitle).length).toBeGreaterThan(0),
    );
  });

  it('records no event id when Sentry is off, so none points nowhere', async () => {
    sentryEnabled.current = false;
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    fireEvent.click(screen.getByText(CONSUMER_COPY.error.reportLink));
    fireEvent.change(screen.getAllByRole('textbox')[0]!, {
      target: { value: 'Blank' },
    });
    fireEvent.click(screen.getAllByText(COPY.send)[0]!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]?.body).not.toContain('sentryEventId');
  });

  it('opens a fresh form after one report was sent', async () => {
    render(<ProtectedError error={new Error('x')} reset={vi.fn()} />);
    fireEvent.click(screen.getByText(CONSUMER_COPY.error.reportLink));
    fireEvent.change(screen.getAllByRole('textbox')[0]!, {
      target: { value: 'Blank' },
    });
    fireEvent.click(screen.getAllByText(COPY.send)[0]!);
    await waitFor(() =>
      expect(screen.getAllByText(COPY.sentTitle).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByText(COPY.close)[0]!);
    fireEvent.click(screen.getByText(CONSUMER_COPY.error.reportLink));
    expect(screen.queryByText(COPY.sentTitle)).toBeNull();
    expect(screen.getAllByRole('textbox')[0]).toHaveProperty('value', '');
  });
});
