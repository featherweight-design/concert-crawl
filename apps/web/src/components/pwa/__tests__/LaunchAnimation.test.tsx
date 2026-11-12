// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

// Deliberately no feature-flag mock and no QueryClientProvider: the animation
// has no switch, so it must mount and play with nothing around it.
import { LaunchAnimation, coreAtFull, markCorner } from '../LaunchAnimation';
import { LAUNCH_MS, LAUNCH_PLAYED_KEY } from '@/lib/pwa/launch';

const stubDisplay = (standalone: boolean, reduced = false) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('standalone') ? standalone : reduced,
  }));
};

beforeEach(() => {
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
    render(<LaunchAnimation />);
    // jsdom has none: an opaque overlay with nothing to end it must not mount
    // over a usable app.
    expect(screen.queryByTestId('launch-animation')).toBeNull();
  });

  it('draws over a first ever cold standalone start with no flag provider, then goes', () => {
    vi.useFakeTimers();
    stubDisplay(true);
    stubStuckAnimate();
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
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    render(<LaunchAnimation />);
    const mark = screen.getByTestId('launch-mark');
    expect(mark?.style.width).toBe('96px');
    // jsdom serialises a zero origin as '0 0'; a browser may say '0px 0px'.
    expect(['0 0', '0px 0px']).toContain(mark?.style.transformOrigin);
    // Addendum 2 item 22: translate(131px, 358px) scale(1.333).
    expect(mark?.style.transform).toBe(
      `translate(131px, 358px) scale(${128 / 96})`,
    );
  });

  it('puts the full-size core at about (250, 320), not the box centred', () => {
    expect(coreAtFull(390, 844)).toEqual({ x: 250, y: 320 });
    const corner = markCorner(390, 844, 4.2, false);
    expect(corner.x).toBeCloseTo(-52.4, 1);
    expect(corner.y).toBeCloseTo(219.2, 1);
    expect(markCorner(390, 844, 128 / 96, true)).toEqual({ x: 131, y: 358 });
  });

  it('scales the core offset with the viewport so a narrow screen is not cropped', () => {
    const board = markCorner(390, 844, 4.2, false);
    const narrow = markCorner(320, 568, 4.2, false);
    // The art is a fixed 4.2 x 96 = 403px wide, so only the core offset moves
    // the left edge. Board: 55 - 302.4 = -247.4 from centre. At 320 wide the
    // offset scales by 320/390 = 0.8205 (45.13), giving -257.27. The clamp's
    // floor (0.8) caps the extra shift at 55 * 0.2 = 11px, so the narrow edge
    // is never more than 11px further left than the board's.
    const maxShift = 55 * (1 - 0.8);
    expect(narrow.x - 320 / 2).toBeGreaterThanOrEqual(
      board.x - 390 / 2 - maxShift,
    );
    expect(coreAtFull(320, 568).x).toBeLessThan(160 + 55);
    expect(coreAtFull(320, 568).x).toBeGreaterThan(160);
  });

  it('has the bloom back to opacity 0 by the time the mark starts to shrink', () => {
    stubDisplay(true);
    const bloomFrames: Keyframe[][] = [];
    Element.prototype.animate = vi.fn(function (
      this: Element,
      keyframes: Keyframe[],
    ) {
      if (this.getAttribute('data-testid') === 'launch-bloom') {
        bloomFrames.push(keyframes);
      }
      return {
        finished: new Promise<Animation>(() => undefined),
        cancel: () => undefined,
      } as unknown as Animation;
    }) as unknown as typeof Element.prototype.animate;
    render(<LaunchAnimation />);
    const frames = bloomFrames[0] ?? [];
    const settled = frames.find(
      (frame, index) =>
        index > 0 &&
        frame.opacity === 0 &&
        Number(frame.offset) > Number(frames[2]?.offset),
    );
    expect(Number(frames[2]?.opacity)).toBeGreaterThan(0);
    expect(Number(settled?.offset)).toBeLessThanOrEqual(
      LAUNCH_MS.shrinkStart / LAUNCH_MS.total,
    );
  });

  it('draws a 330px pink bloom centred on the core, hidden until it pulses', () => {
    stubDisplay(true);
    stubStuckAnimate();
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 844);
    render(<LaunchAnimation />);
    const bloom = screen.getByTestId('launch-bloom');
    expect(bloom.style.width).toBe('330px');
    expect(bloom.style.left).toBe('85px');
    expect(bloom.style.top).toBe('155px');
    expect(bloom.style.opacity).toBe('0');
    expect(bloom.style.background).toContain('radial-gradient');
  });

  it('draws in fixed brand colours, never theme tokens', () => {
    stubDisplay(true);
    stubStuckAnimate();
    const { container } = render(<LaunchAnimation />);
    const markup = container.innerHTML;
    expect(markup).not.toContain('var(--fg)');
    expect(markup).not.toContain('var(--signal)');
    expect(markup).not.toContain('var(--accent)');
    // jsdom normalises style colours to rgb().
    expect(markup).toContain('color: rgb(232, 243, 255)');
    expect(markup).toContain('color: rgb(255, 123, 212)');
    expect(markup).toContain('fill: rgb(122, 230, 255)');
  });

  it('marks the session so a later mount is not a cold start', () => {
    stubDisplay(true);
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
    render(<LaunchAnimation />);
    expect(screen.queryByTestId('launch-animation')).toBeNull();
  });

  it('plays on the very first cold start: there is nothing to cache or wait for', () => {
    stubDisplay(true);
    stubStuckAnimate();
    render(<LaunchAnimation />);
    expect(screen.getByTestId('launch-animation')).toBeTruthy();
  });

  it('does not dismiss the overlay when the effect is cancelled on unmount', async () => {
    stubDisplay(true);
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
