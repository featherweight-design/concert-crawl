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
    postMock.mockRejectedValue(new ApiError(500, 'boom'));
    setup([live, delisted]);

    fireEvent.click(dismissButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(COPY.dismiss.failed, {
        id: 'watching-dismiss',
      }),
    );
    expect(screen.getByText(delisted.artist)).toBeTruthy();
    expect(undoToastMock).not.toHaveBeenCalled();
  });

  it('a 409 not_delisted puts the row back and says the show is listed again', async () => {
    postMock.mockRejectedValue(
      new ApiError(409, 'Show is still listed', 'not_delisted'),
    );
    setup([live, delisted]);

    fireEvent.click(dismissButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(COPY.dismiss.stillListed, {
        id: 'watching-dismiss',
      }),
    );
    expect(screen.getByText(delisted.artist)).toBeTruthy();
    expect(undoToastMock).not.toHaveBeenCalled();
  });

  it('a failed Undo hides the row again and offers another go', async () => {
    postMock.mockResolvedValue({ dismissed: true });
    getMock.mockResolvedValue([live]);
    setup([live, delisted]);

    fireEvent.click(dismissButton());
    await waitFor(() => expect(undoToastMock).toHaveBeenCalledTimes(1));

    deleteMock.mockRejectedValue(new ApiError(500, 'boom'));
    await act(async () => pressUndo());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        COPY.dismiss.undoFailed,
        expect.objectContaining({ id: 'watching-dismiss' }),
      ),
    );
    expect(screen.queryByText(delisted.artist)).toBeNull();
  });
});
