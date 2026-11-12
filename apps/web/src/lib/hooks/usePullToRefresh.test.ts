// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  PULL_MAX_PX,
  PULL_READY_PX,
  pullDistance,
  usePullToRefresh,
} from './usePullToRefresh';

const touch = (type: string, clientY: number) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientY }],
  });
  window.dispatchEvent(event);
  return event;
};

describe('pullDistance', () => {
  it('halves the finger travel and caps it', () => {
    expect(pullDistance(40)).toBe(20);
    expect(pullDistance(10_000)).toBe(PULL_MAX_PX);
    expect(pullDistance(-30)).toBe(0);
  });
});

describe('usePullToRefresh', () => {
  it('opens a 74px zone: ready at 74, still pulling just short of it', () => {
    expect(PULL_READY_PX).toBe(74);
    const { result } = renderHook(() =>
      usePullToRefresh(vi.fn().mockResolvedValue(undefined)),
    );
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 100 + 73 * 2);
    });
    expect(result.current.state).toBe('pulling');
    act(() => {
      touch('touchmove', 100 + 74 * 2);
    });
    expect(result.current.state).toBe('ready');
  });

  it('commits a refresh when released past the ready height, and settles after', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 100 + PULL_READY_PX * 2 + 4);
    });
    expect(result.current.state).toBe('ready');

    await act(async () => {
      touch('touchend', 0);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
    expect(result.current.height).toBe(0);
  });

  it('does nothing when released short of the ready height', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 120);
    });
    expect(result.current.state).toBe('pulling');
    act(() => {
      touch('touchend', 0);
    });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('ignores a pull that starts below the top of the page', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'scrollY', {
      value: 200,
      configurable: true,
    });
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 300);
    });
    expect(result.current.state).toBe('idle');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('cancels the browser overscroll only while a pull is under way', () => {
    renderHook(() => usePullToRefresh(vi.fn().mockResolvedValue(undefined)));
    let move: Event | undefined;
    act(() => {
      touch('touchstart', 100);
      move = touch('touchmove', 180);
    });
    expect(move?.defaultPrevented).toBe(true);
    let scroll: Event | undefined;
    act(() => {
      touch('touchend', 0);
      touch('touchstart', 300);
      scroll = touch('touchmove', 200); // upward: an ordinary scroll
    });
    expect(scroll?.defaultPrevented).toBe(false);
  });

  it('holds the indicator when a finger lifts during a refresh', async () => {
    let settle: () => void = () => undefined;
    const onRefresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 100 + PULL_READY_PX * 2 + 4);
      touch('touchend', 0);
    });
    expect(result.current.state).toBe('refreshing');
    act(() => {
      touch('touchend', 0);
    });
    expect(result.current.state).toBe('refreshing');
    await act(async () => {
      settle();
    });
    expect(result.current.state).toBe('idle');
  });

  it('resets, and never reloads, when the OS cancels the gesture', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));
    act(() => {
      touch('touchstart', 100);
      touch('touchmove', 100 + PULL_READY_PX * 2 + 4);
    });
    expect(result.current.state).toBe('ready');
    act(() => {
      touch('touchcancel', 0);
    });
    expect(result.current.state).toBe('idle');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('ignores a second finger so pinch-zoom is never blocked', () => {
    const { result } = renderHook(() =>
      usePullToRefresh(vi.fn().mockResolvedValue(undefined)),
    );
    const pinch = new Event('touchstart', { cancelable: true });
    Object.defineProperty(pinch, 'touches', {
      value: [{ clientY: 100 }, { clientY: 140 }],
    });
    let move: Event | undefined;
    act(() => {
      window.dispatchEvent(pinch);
      move = touch('touchmove', 300);
    });
    expect(move?.defaultPrevented).toBe(false);
    expect(result.current.state).toBe('idle');
  });

  it('lets go of a stuck refresh after the backstop', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        usePullToRefresh(() => new Promise<void>(() => undefined)),
      );
      act(() => {
        touch('touchstart', 100);
        touch('touchmove', 100 + PULL_READY_PX * 2 + 4);
        touch('touchend', 0);
      });
      expect(result.current.state).toBe('refreshing');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(result.current.state).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });
});
