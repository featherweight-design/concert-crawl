// @vitest-environment jsdom

// The No longer listed dismiss, end to end through the real list, row and
// mutation hook. Only the network (apiClient), auth and the toaster are fakes.
// - the × appears on a No longer listed row and nowhere else
// - a tap hides the row at once, before the server answers
// - success raises the Undo toast; Undo DELETEs and the row comes back
// - a failure, a 409 `not_delisted` included, puts the row back

import type { ReactNode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import type { WatchingShow } from '@concert-crawl/types';
import type * as ApiModule from '@/lib/api';

const TEST_USER_ID = 'user_1';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => 'tok',
    userId: TEST_USER_ID,
    isSignedIn: true,
  }),
}));

const getMock = vi.fn();
const postMock = vi.fn();
const deleteMock = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof ApiModule>('@/lib/api');
  return {
    ...actual,
    apiClient: {
      get: (path: string, token: string) => getMock(path, token),
      post: (path: string, token: string, data: unknown) =>
        postMock(path, token, data),
      delete: (path: string, token: string) => deleteMock(path, token),
      put: vi.fn(),
    },
  };
});

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

// The house Undo toast itself is covered in attendance-toasts.test.tsx; here
// the spy hands back the Undo callback the list gave it.
const undoToastMock = vi.fn();
vi.mock('@/components/consumer/going/lib/attendance-toasts', () => ({
  showUndoToast: (input: unknown) => undoToastMock(input),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('../event-image/EventImage', () => ({
  EventImage: () => <div data-testid="event-image" />,
}));
vi.mock('@/components/consumer/history/MyShowsTabs', () => ({
  MyShowsTabs: () => <nav />,
}));
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutate: vi.fn() }),
}));

const { WatchingContent } = await import('./WatchingContent');
const { ApiError } = await import('@/lib/api');
const { CONSUMER_COPY } =
  await import('@/components/consumer/definitions/copy');
const { watchingQueryKey } = await import('@/lib/queries/use-watching');

const COPY = CONSUMER_COPY.watching;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const makeShow = (over: Partial<WatchingShow> = {}): WatchingShow => ({
  userEventId: 'ue-live',
  eventId: 'ev-live',
  artist: 'Wednesday',
  venueName: 'Globe Hall',
  venueSlug: 'globe-hall',
  date: '2099-07-15',
  showTime: '20:00',
  ticketUrl: null,
  ticketLinks: null,
  savedAt: '2099-01-01T00:00:00.000Z',
  savedPrice: 30,
  currentPrice: 30,
  priceSourceCategory: null,
  eventStatus: 'upcoming',
  watchStatus: 'live',
  updatedAt: '2099-01-01T00:00:00.000Z',
  priceObservedAt: null,
  genres: [],
  imageUrl: null,
  artistPhotoUrl: null,
  attendingAt: null,
  ...over,
});

const live = makeShow();
const delisted = makeShow({
  userEventId: 'ue-nll',
  eventId: 'ev-nll',
  artist: 'Olive Jones',
  date: '2099-07-20',
  eventStatus: 'cancelled',
  eventDelistedAt: '2099-07-10T00:00:00.000Z',
});

const later = makeShow({
  userEventId: 'ue-later',
  eventId: 'ev-later',
  artist: 'Hotline TNT',
  date: '2099-07-25',
});

// A promise the test settles by hand.
const deferred = () => {
  let resolve: (value: unknown) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Pins the settle refetch so it never lands: whatever the list shows after a
// failure was put there by the rollback, not by the server's next answer.
const pinRefetch = () => getMock.mockReturnValue(new Promise(() => {}));

const cachedIds = (client: QueryClient) =>
  (
    client.getQueryData<WatchingShow[]>(watchingQueryKey(TEST_USER_ID)) ?? []
  ).map((row) => row.eventId);

const setup = (shows: WatchingShow[]) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(watchingQueryKey(TEST_USER_ID), shows);
  render(
    <QueryClientProvider client={client}>
      <WatchingContent initialShows={shows} />
    </QueryClientProvider>,
  );
  return client;
};

const dismissButton = () =>
  screen.getByRole('button', {
    name: COPY.watchingItem.dismissAriaLabel(delisted.artist),
  });

const lastUndoToast = (): Record<string, unknown> => {
  const calls = undoToastMock.mock.calls;
  const input: unknown = calls[calls.length - 1]?.[0];
  if (!isRecord(input)) throw new Error('expected an Undo toast');
  return input;
};

const pressUndo = () => {
  const { onUndo } = lastUndoToast();
  if (typeof onUndo !== 'function') throw new Error('expected an Undo');
  onUndo();
};

beforeEach(() => {
  vi.clearAllMocks();
  // The settle refetch answers with whatever the server would now say; each
  // test sets it to match the outcome it is driving.
  getMock.mockResolvedValue([live, delisted]);
});

afterEach(cleanup);

describe('Watching: dismissing a No longer listed show', () => {
  it('puts the dismiss × on the No longer listed row only', () => {
    setup([live, delisted]);

    expect(screen.getAllByTestId('watching-dismiss')).toHaveLength(1);
    expect(dismissButton()).toBeTruthy();
    // The live row keeps its remove ×, and gets no dismiss.
    expect(
      screen.getByRole('button', {
        name: COPY.watchingItem.removeAriaLabel(live.artist),
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: COPY.watchingItem.removeAriaLabel(delisted.artist),
      }),
    ).toBeNull();
  });

  it('draws the board × at full weight, never dimmed by the removed row', () => {
    setup([live, delisted]);

    const dismiss = dismissButton();
    const remove = screen.getByRole('button', {
      name: COPY.watchingItem.removeAriaLabel(live.artist),
    });

    // addendum-3 `02/nll-row-watching-m`: 14px box, 16-unit view, 1.6 stroke.
    const glyph = dismiss.querySelector('svg');
    expect(glyph?.getAttribute('width')).toBe('14');
    expect(glyph?.getAttribute('height')).toBe('14');
    expect(glyph?.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(glyph?.querySelector('path')?.getAttribute('stroke-width')).toBe(
      '1.6',
    );

    // The same ink as a live row's remove ×: --fg-subtle, brightening on hover.
    for (const token of ['text-fg-subtle', 'hover:text-fg']) {
      expect(dismiss.classList.contains(token)).toBe(true);
      expect(remove.classList.contains(token)).toBe(true);
    }

    // Nothing between the × and the page fades it: the removed row's
    // greyscale and fade belong to the artwork only.
    for (
      let node: HTMLElement | null = dismiss;
      node && node !== document.body;
      node = node.parentElement
    ) {
      expect(node.style.opacity === '' || node.style.opacity === '1').toBe(
        true,
      );
      expect(node.style.filter).toBe('');
      expect(
        [...node.classList].some(
          (cls) => cls.startsWith('opacity-') || cls === 'grayscale',
        ),
      ).toBe(false);
    }
  });

  it('hides the row at once, then raises the Undo toast on success', async () => {
    let answer: (value: unknown) => void = () => {};
    postMock.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    getMock.mockResolvedValue([live]);
    setup([live, delisted]);

    fireEvent.click(dismissButton());

    // Gone before the server has answered.
    await waitFor(() => expect(screen.queryByText(delisted.artist)).toBeNull());
    expect(undoToastMock).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith(
      '/v1/watching/ev-nll/dismiss',
      'tok',
      {},
    );

    await act(async () => answer({ dismissed: true }));

    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));
    expect(lastUndoToast()).toMatchObject({
      id: 'watching-dismiss',
      message: COPY.dismiss.hidden(delisted.artist),
      undoLabel: COPY.dismiss.undo,
    });
    expect(screen.queryByText(delisted.artist)).toBeNull();
    expect(screen.getByText(live.artist)).toBeTruthy();
  });

  it('Undo DELETEs the dismissal and the row comes back', async () => {
    postMock.mockResolvedValue({ dismissed: true });
    getMock.mockResolvedValue([live]);
    setup([live, delisted]);

    fireEvent.click(dismissButton());
    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(delisted.artist)).toBeNull();

    deleteMock.mockResolvedValue({ dismissed: false });
    getMock.mockResolvedValue([live, delisted]);
    await act(async () => pressUndo());

    expect(deleteMock).toHaveBeenCalledWith(
      '/v1/watching/ev-nll/dismiss',
      'tok',
    );
    await waitFor(() => expect(screen.getByText(delisted.artist)).toBeTruthy());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('a failed POST puts the row back and raises the error toast', async () => {
    const post = deferred();
    postMock.mockReturnValue(post.promise);
    pinRefetch();
    const client = setup([live, delisted]);

    fireEvent.click(dismissButton());
    await waitFor(() => expect(cachedIds(client)).toEqual(['ev-live']));

    await act(async () => post.reject(new ApiError(500, 'boom')));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(COPY.dismiss.failed, {
        id: 'watching-dismiss',
      }),
    );
    // The refetch never answered, so only the rollback could have done this.
    expect(cachedIds(client)).toEqual(['ev-live', 'ev-nll']);
    expect(screen.getByText(delisted.artist)).toBeTruthy();
    expect(undoToastMock).not.toHaveBeenCalled();
  });

  it('a 409 not_delisted never restores the stale row; the refetch brings the fresh one', async () => {
    const post = deferred();
    postMock.mockReturnValue(post.promise);
    const refetch = deferred();
    getMock.mockReturnValue(refetch.promise);
    const client = setup([live, delisted]);

    const button = dismissButton();
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(cachedIds(client)).toEqual(['ev-live']));
    getMock.mockClear();

    await act(async () =>
      post.reject(new ApiError(409, 'Show is still listed', 'not_delisted')),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(COPY.dismiss.stillListed, {
        id: 'watching-dismiss',
      }),
    );
    // The stale delisted row stays out, so its dismiss × never flashes back,
    // and the list is refetched for the fresh one.
    expect(cachedIds(client)).toEqual(['ev-live']);
    expect(screen.queryByTestId('watching-dismiss')).toBeNull();
    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(undoToastMock).not.toHaveBeenCalled();

    // The server's answer: the show is listed again, so a live row.
    const relisted = makeShow({
      ...delisted,
      eventStatus: 'upcoming',
      eventDelistedAt: null,
    });
    await act(async () => refetch.resolve([live, relisted]));

    await waitFor(() =>
      expect(cachedIds(client)).toEqual(['ev-live', 'ev-nll']),
    );
    expect(screen.queryByTestId('watching-dismiss')).toBeNull();
    // Focus goes back to the returned row's ×, now its remove ×.
    const removeButton = screen.getByRole('button', {
      name: COPY.watchingItem.removeAriaLabel(delisted.artist),
    });
    await waitFor(() => expect(document.activeElement).toBe(removeButton));
  });

  it('a failed POST returns focus to the restored row’s ×', async () => {
    const post = deferred();
    postMock.mockReturnValue(post.promise);
    pinRefetch();
    setup([live, delisted, later]);

    const button = dismissButton();
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByText(delisted.artist)).toBeNull());
    // While the POST is out, focus sits on the next row.
    expect(
      document
        .querySelector('[data-watching-event="ev-later"]')
        ?.contains(document.activeElement),
    ).toBe(true);

    await act(async () => post.reject(new ApiError(500, 'boom')));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(COPY.dismiss.failed, {
        id: 'watching-dismiss',
      }),
    );
    await waitFor(() => expect(document.activeElement).toBe(dismissButton()));
  });

  it('a failed Undo hides the row again and offers another go', async () => {
    postMock.mockResolvedValue({ dismissed: true });
    pinRefetch();
    const client = setup([live, delisted]);

    fireEvent.click(dismissButton());
    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));

    const del = deferred();
    deleteMock.mockReturnValue(del.promise);
    await act(async () => pressUndo());

    // The Undo puts the row back at once...
    await waitFor(() => expect(screen.getByText(delisted.artist)).toBeTruthy());

    // ...and only the rollback takes it away again.
    await act(async () => del.reject(new ApiError(500, 'boom')));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        COPY.dismiss.undoFailed,
        expect.objectContaining({ id: 'watching-dismiss' }),
      ),
    );
    expect(cachedIds(client)).toEqual(['ev-live']);
    expect(screen.queryByText(delisted.artist)).toBeNull();
  });

  it('a fast second tap sends no second POST', async () => {
    postMock.mockReturnValue(new Promise(() => {}));
    pinRefetch();
    setup([live, delisted]);

    const button = dismissButton();
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the next row when the dismissed row had one', async () => {
    postMock.mockResolvedValue({ dismissed: true });
    pinRefetch();
    setup([live, delisted, later]);

    const button = dismissButton();
    button.focus();
    fireEvent.click(button);

    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));
    const nextRow = document.querySelector('[data-watching-event="ev-later"]');
    expect(nextRow).not.toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(nextRow?.contains(document.activeElement)).toBe(true);
  });

  it('moves focus to the list heading when the dismissed row was last', async () => {
    postMock.mockResolvedValue({ dismissed: true });
    pinRefetch();
    setup([live, delisted]);

    const button = dismissButton();
    button.focus();
    fireEvent.click(button);

    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));
    expect(document.activeElement).toBe(screen.getByTestId('watching-header'));
  });

  it('a refetch that lands mid-POST cannot bring the row back', async () => {
    const post = deferred();
    postMock.mockReturnValue(post.promise);
    const client = setup([live, delisted]);

    fireEvent.click(dismissButton());
    await waitFor(() => expect(screen.queryByText(delisted.artist)).toBeNull());

    // The server has not seen the POST yet, so this refetch still lists it.
    getMock.mockResolvedValue([live, delisted]);
    await act(async () => {
      await client.refetchQueries({
        queryKey: watchingQueryKey(TEST_USER_ID),
      });
    });
    expect(cachedIds(client)).toEqual(['ev-live', 'ev-nll']);
    expect(screen.queryByText(delisted.artist)).toBeNull();

    pinRefetch();
    await act(async () => post.resolve({ dismissed: true }));

    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));
    expect(cachedIds(client)).toEqual(['ev-live']);
    expect(screen.queryByText(delisted.artist)).toBeNull();
  });

  it('a failed POST puts back only its own row, at its old place', async () => {
    const post = deferred();
    postMock.mockReturnValue(post.promise);
    pinRefetch();
    const client = setup([live, delisted, later]);

    fireEvent.click(dismissButton());
    await waitFor(() =>
      expect(cachedIds(client)).toEqual(['ev-live', 'ev-later']),
    );

    // Something else changes the list while the POST is out.
    act(() => {
      client.setQueryData<WatchingShow[]>(
        watchingQueryKey(TEST_USER_ID),
        (current) =>
          current?.map((row) =>
            row.eventId === 'ev-live' ? { ...row, currentPrice: 22 } : row,
          ),
      );
    });

    await act(async () => post.reject(new ApiError(500, 'boom')));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    const rows =
      client.getQueryData<WatchingShow[]>(watchingQueryKey(TEST_USER_ID)) ?? [];
    expect(rows.map((row) => row.eventId)).toEqual([
      'ev-live',
      'ev-nll',
      'ev-later',
    ]);
    // The other change survived the rollback.
    expect(rows[0]?.currentPrice).toBe(22);
  });

  it('rejects a response body that is not the dismiss shape', async () => {
    postMock.mockResolvedValue({ ok: true });
    pinRefetch();
    const client = setup([live, delisted]);

    fireEvent.click(dismissButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(COPY.dismiss.failed, {
        id: 'watching-dismiss',
      }),
    );
    expect(cachedIds(client)).toEqual(['ev-live', 'ev-nll']);
    expect(undoToastMock).not.toHaveBeenCalled();
  });
});
