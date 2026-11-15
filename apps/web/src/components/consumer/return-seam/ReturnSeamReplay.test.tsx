// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const EVENT_ID = '3f1a9c62-8d4b-4e17-9f2a-1b6c7d8e9f01';

let searchParams = new URLSearchParams();
const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => '/events/e1',
  useRouter: () => ({ replace, push, refresh }),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));

const getToken = vi.fn<() => Promise<string | null>>();
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

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
  replace.mockClear();
  push.mockClear();
  refresh.mockClear();
  toast.mockClear();
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
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('ReturnSeamReplay: replaying a watch (#794)', () => {
  it('does nothing at all when there is no intent', () => {
    render(<ReturnSeamReplay />);
    expect(mutate).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('replays the watch and says so in a toast, with a way to My shows', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toBe(EVENT_ID);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]![0]).toBe('You’re watching Geese.');
    const options = toast.mock.calls[0]![1] as {
      action: { label: string; onClick: () => void };
    };
    expect(options.action.label).toBe('My shows');
    options.action.onClick();
    expect(push).toHaveBeenCalledWith('/watching');
  });

  it('fires exactly once, since the endpoint is a toggle and a second run un-watches', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    const { rerender } = render(<ReturnSeamReplay />);
    rerender(<ReturnSeamReplay />);
    rerender(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledTimes(1);
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
    expect(toast).not.toHaveBeenCalled();
  });

  it('leaves an already-watched show alone but still confirms', () => {
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    watchingData.mockReturnValue([{ eventId: EVENT_ID }]);
    render(<ReturnSeamReplay />);
    expect(mutate).not.toHaveBeenCalled();
    expect(toast.mock.calls[0]![0]).toBe('You’re watching Geese.');
  });

  it('claims nothing when the replay fails', () => {
    // Sold out, unlinked, or deleted mid-flow: the visitor still lands on the
    // destination, but nothing says something happened that did not.
    withIntent(`watch:${EVENT_ID}`, 'Geese');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mutate.mockImplementation((_id, opts) => opts.onError(new Error('gone')));
    render(<ReturnSeamReplay />);
    expect(toast).not.toHaveBeenCalled();
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
    expect(toast).toHaveBeenCalledTimes(1);
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
    expect(toast).not.toHaveBeenCalled();

    // Same session, a different show, this time it works.
    withIntent(`watch:${OTHER_ID}`, 'Ratboys');
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    rerender(<ReturnSeamReplay />);
    expect(toast.mock.calls[0]![0]).toBe('You’re watching Ratboys.');
  });

  it('says nothing when the label is missing, since it cannot name the show', () => {
    withIntent(`watch:${EVENT_ID}`);
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    render(<ReturnSeamReplay />);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('ReturnSeamReplay: replaying a follow', () => {
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
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]![0]).toBe('You’re following TOKiMONSTA.');
    // No "My shows" action: a follow does not live there.
    expect(toast.mock.calls[0]![1]).not.toHaveProperty('action');
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
    expect(replace).toHaveBeenCalledWith('/events/e1');
    expect(post).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('claims nothing when the follow is refused (a plan that cannot follow, a hidden artist)', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    post.mockRejectedValue(new Error('403'));
    render(<ReturnSeamReplay />);
    await flush();
    expect(toast).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('claims nothing when there is no session to follow with', async () => {
    withIntent('follow:tokimonsta', 'TOKiMONSTA');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    getToken.mockResolvedValue(null);
    render(<ReturnSeamReplay />);
    await flush();
    expect(post).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('ignores a follow for something that is not a slug', () => {
    withIntent('follow:../../admin', 'x');
    render(<ReturnSeamReplay />);
    expect(post).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/events/e1');
  });
});
