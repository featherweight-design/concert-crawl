// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, render, cleanup, screen, within } from '@testing-library/react';

const EVENT_ID = '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01';

let searchParams = new URLSearchParams();
let pathname = '/events/e1';
let session = { isLoaded: true, isSignedIn: true };
const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => pathname,
  useRouter: () => ({ replace, push, refresh }),
}));

const getToken = vi.fn<() => Promise<string | null>>();
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, ...session }),
}));

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiClient: { post } }));

const watchingData = vi.fn<() => unknown[] | undefined>(() => []);
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: watchingData() }),
}));

const mutate = vi.fn();
vi.mock('@/lib/queries/use-watch-toggle', () => ({
  useWatchToggle: () => ({ mutate }),
}));

import { ReturnSeamReplay } from './ReturnSeamReplay';

beforeEach(() => {
  searchParams = new URLSearchParams();
  pathname = '/events/e1';
  session = { isLoaded: true, isSignedIn: true };
  replace.mockClear();
  push.mockClear();
  refresh.mockClear();
  mutate.mockClear();
  post.mockReset().mockResolvedValue({ following: true });
  getToken.mockReset().mockResolvedValue('token');
  watchingData.mockReturnValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const withIntent = (raw: string, label?: string) => {
  searchParams = new URLSearchParams({ intent: raw });
  if (label) searchParams.set('label', label);
};
// The follow runs in a promise, then sets state and fires an effect: let all of
// it settle inside act.
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('ReturnSeamReplay: replaying a watch (#794)', () => {
  it('does nothing at all when there is no intent', () => {
    render(<ReturnSeamReplay />);
    expect(mutate).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
  });

  it('replays the watch and says so in the welcome-back strip, with a View link', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toBe(EVENT_ID);
    expect(screen.getAllByTestId('return-seam-strip')).toHaveLength(1);
    expect(screen.getByTestId('return-seam-strip').textContent).toContain(
      'Now watching Geese.',
    );
    const strip = screen.getByTestId('return-seam-strip');
    expect(strip.textContent).toContain('Kept while you were signing up');
    expect(strip.getAttribute('role')).toBe('status');
    expect(
      within(strip).getByRole('link', { name: 'View' }).getAttribute('href'),
    ).toBe('/watching');
  });

  it('fires exactly once, since the endpoint is a toggle and a second run un-watches', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    const { rerender } = render(<ReturnSeamReplay />);
    rerender(<ReturnSeamReplay />);
    rerender(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('return-seam-strip')).toHaveLength(1);
  });

  it('strips the params so a refresh or a share cannot replay it', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(replace).toHaveBeenCalledWith('/events/e1');
  });

  it('strips a malformed intent too, without calling anything', () => {
    withIntent('watch:not-a-uuid', 'Geese');
    render(<ReturnSeamReplay />);
    expect(replace).toHaveBeenCalledWith('/events/e1');
    expect(mutate).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
  });

  it('leaves an already-watched show alone but still confirms', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    watchingData.mockReturnValue([{ eventId: EVENT_ID }]);
    render(<ReturnSeamReplay />);
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('return-seam-strip').textContent).toContain(
      'Now watching Geese.',
    );
  });

  it('claims nothing when the replay fails', () => {
    // Sold out, unlinked, or deleted mid-flow: the visitor still lands on the
    // destination, but nothing says something happened that did not.
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mutate.mockImplementation((_id, opts) => opts.onError(new Error('gone')));
    render(<ReturnSeamReplay />);
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
  });

  it('waits for the watching list before firing, since a cold cache reads as not-watching', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    watchingData.mockReturnValue(undefined);
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    const { rerender } = render(<ReturnSeamReplay />);
    // Firing here would toggle an already-watched show off.
    expect(mutate).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    watchingData.mockReturnValue([]);
    rerender(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('still confirms after the params it was built from are gone', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    const { rerender } = render(<ReturnSeamReplay />);
    // The real router.replace lands the component on a param-free URL.
    searchParams = new URLSearchParams();
    rerender(<ReturnSeamReplay />);
    expect(screen.getAllByTestId('return-seam-strip')).toHaveLength(1);
  });

  it("leaves the destination's own query params in place", () => {
    searchParams = new URLSearchParams({
      tab: 'prices',
      intent: `watch:${EVENT_ID}`,
      label: 'Geese',
    });
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(replace).toHaveBeenCalledWith('/events/e1?tab=prices');
  });

  it("keeps the destination's fragment when it strips the params", () => {
    window.location.hash = '#lineup';
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(replace).toHaveBeenCalledWith('/events/e1#lineup');
    window.location.hash = '';
  });

  it('starts clean on a second intent: a past failure must not mute the next', () => {
    const OTHER_ID = '7c2b4e91-3a5d-4f68-8b1c-2d9e0f3a4b56';
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mutate.mockImplementation((_id, opts) => opts.onError(new Error('gone')));
    const { rerender } = render(<ReturnSeamReplay />);
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();

    // Same session, a different show, this time it works.
    withIntent(`watch:${OTHER_ID}`, 'Ratboys');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    rerender(<ReturnSeamReplay />);
    expect(screen.getByTestId('return-seam-strip').textContent).toContain(
      'Now watching Ratboys.',
    );
  });

  it('says nothing when the label is missing, since it cannot name the show', () => {
    withIntent(`watch:${EVENT_ID}`);
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
  });
});

describe('ReturnSeamReplay: replaying a follow', () => {
  beforeEach(() => {
    // A Follow lives on the artist's page: that is where sign-in sends them back.
    pathname = '/artists/tokimonsta';
  });

  it('follows only the artist whose page this is, never one a link names', async () => {
    pathname = '/events/e1';
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    render(<ReturnSeamReplay />);
    await flush();
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
    // The params go all the same, so the link does not linger in the URL.
    expect(replace).toHaveBeenCalledWith('/events/e1');
    cleanup();
    pathname = '/artists/another-band';
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    render(<ReturnSeamReplay />);
    await flush();
    expect(post).not.toHaveBeenCalled();
  });

  it('waits for Clerk to have a session, since the params are stripped once it acts', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    session = { isLoaded: false, isSignedIn: false };
    const { rerender } = render(<ReturnSeamReplay />);
    await flush();
    expect(post).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    session = { isLoaded: true, isSignedIn: true };
    rerender(<ReturnSeamReplay />);
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('return-seam-strip')).toHaveLength(1);
  });

  it('follows the artist, refreshes the page it just rendered, and says so', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    render(<ReturnSeamReplay />);
    await flush();
    expect(post).toHaveBeenCalledWith(
      '/v1/artists/tokimonsta/follow',
      'token',
      {},
    );
    // The page was rendered before the follow existed.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('return-seam-strip')).toHaveLength(1);
    expect(screen.getByTestId('return-seam-strip').textContent).toContain(
      'Now following TOKiMONSTA.',
    );
    // No "My shows" action: a follow does not live there.
    expect(
      within(screen.getByTestId('return-seam-strip')).queryByRole('link'),
    ).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('does not wait for the watching list, which a follow has nothing to do with', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    watchingData.mockReturnValue(undefined);
    render(<ReturnSeamReplay />);
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('strips the params, and follows once however often it re-renders', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    const { rerender } = render(<ReturnSeamReplay />);
    rerender(<ReturnSeamReplay />);
    await flush();
    expect(replace).toHaveBeenCalledWith('/artists/tokimonsta');
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('return-seam-strip')).toHaveLength(1);
  });

  it('claims nothing when the follow is refused (a plan that cannot follow, a hidden artist)', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    post.mockRejectedValue(new Error('403'));
    render(<ReturnSeamReplay />);
    await flush();
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('claims nothing when there is no session to follow with', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    getToken.mockResolvedValue(null);
    render(<ReturnSeamReplay />);
    await flush();
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByTestId('return-seam-strip')).toBeNull();
  });

  it('ignores a follow for something that is not a slug', () => {
    withIntent('follow:../../admin', 'x');
    render(<ReturnSeamReplay />);
    expect(post).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/artists/tokimonsta');
  });

  describe('the strip lifetime', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('is gone after six seconds', () => {
      vi.useFakeTimers();
      withIntent(`watch:${EVENT_ID}`, 'Geese');
      mutate.mockImplementation((_id, opts) => opts.onSuccess());
      render(<ReturnSeamReplay />);
      expect(screen.getByTestId('return-seam-strip')).toBeDefined();
      act(() => {
        vi.advanceTimersByTime(5999);
      });
      expect(screen.queryByTestId('return-seam-strip')).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByTestId('return-seam-strip')).toBeNull();
    });

    it('is gone on any navigation', () => {
      withIntent(`watch:${EVENT_ID}`, 'Geese');
      mutate.mockImplementation((_id, opts) => opts.onSuccess());
      const view = render(<ReturnSeamReplay />);
      expect(screen.getByTestId('return-seam-strip')).toBeDefined();
      pathname = '/events';
      view.rerender(<ReturnSeamReplay />);
      expect(screen.queryByTestId('return-seam-strip')).toBeNull();
    });
  });
});
