// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PullToRefresh } from './PullToRefresh';
import { PINK_WAVE_COPY } from './definitions/copy';

const refetchQueries = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({
  refresh: null as null | (() => Promise<void>),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ refetchQueries }),
}));
vi.mock('sonner', () => ({ toast: { error: toastError } }));
vi.mock('@/lib/motion/use-reduced-motion', () => ({
  useReducedMotion: () => true,
}));
vi.mock('@/lib/hooks/usePullToRefresh', () => ({
  usePullToRefresh: (refresh: () => Promise<void>) => {
    captured.refresh = refresh;
    return { height: 0, state: 'idle' };
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  refetchQueries.mockReset();
  toastError.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PullToRefresh', () => {
  it('raises an error toast when the reload fails, instead of closing silently', async () => {
    refetchQueries.mockRejectedValueOnce(new Error('503'));
    render(<PullToRefresh />);
    const done = captured.refresh?.();
    await vi.advanceTimersByTimeAsync(1500);
    await done;
    expect(toastError).toHaveBeenCalledWith(PINK_WAVE_COPY.refreshFailed, {
      id: 'pull-refresh',
    });
  });

  it('says nothing when the reload works', async () => {
    refetchQueries.mockResolvedValueOnce(undefined);
    render(<PullToRefresh />);
    const done = captured.refresh?.();
    await vi.advanceTimersByTimeAsync(1500);
    await done;
    expect(toastError).not.toHaveBeenCalled();
  });
});
