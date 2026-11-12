// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

const flagState = { enabled: true, isLoading: false, loaded: true };
vi.mock('@/lib/queries/use-feature-flags', () => ({
  useFeatureFlag: () => flagState,
}));

import { LaunchAnimation } from '../LaunchAnimation';
import { LAUNCH_FLAG_KEY, LAUNCH_PLAYED_KEY } from '@/lib/pwa/launch';

const stubDisplay = (standalone: boolean, reduced = false) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('standalone') ? standalone : reduced,
  }));
};

beforeEach(() => {
  flagState.enabled = true;
  flagState.isLoading = false;
  flagState.loaded = true;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as { animate?: unknown }).animate;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// An animation that never reports finished, so only the failsafe can end it.
const stubStuckAnimate = () => {
  Element.prototype.animate = vi.fn(
    () =>
      ({
        finished: new Promise<Animation>(() => undefined),
        cancel: () => undefined,
      }) as unknown as Animation,
  );
};

describe('LaunchAnimation', () => {
  it('goes at once when there is no Web Animations API to wait on', () => {
    stubDisplay(true);
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    render(<LaunchAnimation />);
    // jsdom has none: an opaque overlay with nothing to end it must not mount
    // over a usable app.
    expect(screen.queryByTestId('launch-animation')).toBeNull();
  });

  it('draws over a cold standalone start when the cached flag is on, then goes', () => {
    vi.useFakeTimers();
    stubDisplay(true);
    stubStuckAnimate();
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    render(<LaunchAnimation />);
    const overlay = screen.getByTestId('launch-animation');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.style.pointerEvents).toBe('none');
    // The animation never finishes, so only the failsafe can end it.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId('launch-animation')).toBeNull();
  });

  it('starts the mark at 128/96 (1.333x), centred on the viewport', () => {
    stubDisplay(true);
    stubStuckAnimate();
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    render(<LaunchAnimation />);
    const mark = screen.getByTestId('launch-mark');
    expect(mark?.style.width).toBe('96px');
    expect(mark?.style.left).toBe('calc(50% - 48px)');
    expect(mark?.style.top).toBe('calc(50% - 48px)');
    expect(mark?.style.transform).toBe(`scale(${128 / 96})`);
  });

  it('marks the session so a later mount is not a cold start', () => {
    stubDisplay(true);
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    const first = render(<LaunchAnimation />);
    expect(window.sessionStorage.getItem(LAUNCH_PLAYED_KEY)).toBe('1');
    first.unmount();
    render(<LaunchAnimation />);
    expect(screen.queryByTestId('launch-animation')).toBeNull();
  });

  it.each([
    ['a browser tab', () => stubDisplay(false)],
    ['reduced motion', () => stubDisplay(true, true)],
  ])('stays out of %s', (_label, setup) => {
    setup();
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    render(<LaunchAnimation />);
    expect(screen.queryByTestId('launch-animation')).toBeNull();
  });

  it('does not play on the first ever cold start: the flag is not cached yet', () => {
    stubDisplay(true);
    render(<LaunchAnimation />);
    expect(screen.queryByTestId('launch-animation')).toBeNull();
    // ...but the answer is stored for the next one.
    expect(window.localStorage.getItem(LAUNCH_FLAG_KEY)).toBe('1');
  });

  it('never stores the registry default before the flag has loaded', () => {
    stubDisplay(true);
    flagState.isLoading = true;
    flagState.loaded = false;
    flagState.enabled = false;
    render(<LaunchAnimation />);
    expect(window.localStorage.getItem(LAUNCH_FLAG_KEY)).toBeNull();
  });

  it('does not overwrite the cached flag after a failed fetch', () => {
    stubDisplay(true);
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    // Offline cold start: not pending, no data, registry default false.
    flagState.isLoading = false;
    flagState.loaded = false;
    flagState.enabled = false;
    render(<LaunchAnimation />);
    expect(window.localStorage.getItem(LAUNCH_FLAG_KEY)).toBe('1');
  });

  it('does not dismiss the overlay when the effect is cancelled on unmount', async () => {
    stubDisplay(true);
    window.localStorage.setItem(LAUNCH_FLAG_KEY, '1');
    let reject: (reason: unknown) => void = () => undefined;
    const finished = new Promise<Animation>((_resolve, rej) => {
      reject = rej;
    });
    const cancel = vi.fn(() => reject(new DOMException('', 'AbortError')));
    Element.prototype.animate = vi.fn(
      () => ({ finished, cancel }) as unknown as Animation,
    );
    const view = render(<LaunchAnimation />);
    expect(screen.getByTestId('launch-animation')).toBeTruthy();
    // StrictMode-style: cleanup cancels, the rejection must not call onDone.
    view.rerender(<LaunchAnimation />);
    await act(async () => {
      cancel();
      await Promise.resolve();
    });
    expect(screen.queryByTestId('launch-animation')).not.toBeNull();
    delete (Element.prototype as { animate?: unknown }).animate;
  });
});
