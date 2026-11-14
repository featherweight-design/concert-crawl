// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

// Deliberately no feature-flag mock and no QueryClientProvider: the animation
// has no switch, so it must render with nothing around it.
import { LaunchAnimation } from '../LaunchAnimation';
import { LAUNCH_ATTR, LAUNCH_MS, LAUNCH_PLAYED_KEY } from '@/lib/pwa/launch';

const launching = () => document.documentElement.hasAttribute(LAUNCH_ATTR);

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute(LAUNCH_ATTR);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LaunchAnimation', () => {
  // The overlay is server-rendered into every signed-in document and shown by
  // `<html data-launch>` alone, so it is in the first frame, before hydration.
  it('is always in the markup, hidden and shown by CSS, not by React state', () => {
    render(<LaunchAnimation />);
    const overlay = screen.getByTestId('launch-animation');
    expect(overlay.className).toBe('launch-loader');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('launch-mark')).toBeTruthy();
  });

  it('draws the wordmark and DENVER', () => {
    const { container } = render(<LaunchAnimation />);
    expect(container.textContent).toContain('concert');
    expect(container.textContent).toContain('DENVER');
  });

  it('draws a 330px pink bloom, hidden until it pulses', () => {
    render(<LaunchAnimation />);
    const bloom = screen.getByTestId('launch-bloom');
    expect(bloom.style.width).toBe('330px');
    expect(bloom.style.opacity).toBe('0');
    expect(bloom.style.background).toContain('radial-gradient');
  });

  it('delays each trail dot a step after the one before it', () => {
    const { container } = render(<LaunchAnimation />);
    const delays = [
      ...container.querySelectorAll<SVGCircleElement>('.ll-dot'),
    ].map((dot) => dot.style.animationDelay);
    expect(delays.length).toBeGreaterThan(1);
    delays.forEach((delay, index) =>
      expect(delay).toBe(
        `${LAUNCH_MS.trailStart + LAUNCH_MS.trailStep * index}ms`,
      ),
    );
  });

  it('draws in fixed brand colours, never theme tokens', () => {
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

  // The motion is CSS now: nothing may start after hydration, which is what
  // let a slow phone's main thread finish the old animation unseen.
  it('starts no script animation', () => {
    const animate = vi.fn();
    Element.prototype.animate = animate;
    render(<LaunchAnimation />);
    delete (Element.prototype as { animate?: unknown }).animate;
    expect(animate).not.toHaveBeenCalled();
  });

  it('records the launch as played, the overlay alone writing the flag', () => {
    render(<LaunchAnimation />);
    expect(window.sessionStorage.getItem(LAUNCH_PLAYED_KEY)).toBe('1');
  });

  it('stops showing when its own animation ends', () => {
    document.documentElement.setAttribute(LAUNCH_ATTR, '1');
    render(<LaunchAnimation />);
    expect(launching()).toBe(true);
    // A child's animationend bubbles up and must not end the overlay early.
    fireEvent.animationEnd(screen.getByTestId('launch-mark'));
    expect(launching()).toBe(true);
    fireEvent.animationEnd(screen.getByTestId('launch-animation'));
    expect(launching()).toBe(false);
  });

  // Hydration later than the animation misses its end event.
  it('stops showing after a failsafe even if no end event comes', () => {
    vi.useFakeTimers();
    document.documentElement.setAttribute(LAUNCH_ATTR, '1');
    render(<LaunchAnimation />);
    act(() => {
      vi.advanceTimersByTime(LAUNCH_MS.total);
    });
    expect(launching()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(launching()).toBe(false);
  });

  it('clears its failsafe on unmount', () => {
    vi.useFakeTimers();
    document.documentElement.setAttribute(LAUNCH_ATTR, '1');
    const view = render(<LaunchAnimation />);
    view.unmount();
    act(() => {
      vi.advanceTimersByTime(LAUNCH_MS.total + 2000);
    });
    // The timer is cleared with the component; the CSS alone ends the show.
    expect(launching()).toBe(true);
  });
});
