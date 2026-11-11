// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkeletonBlock } from '../skeleton/SkeletonBlock';
import { PinkWave } from './PinkWave';

let reduced = false;
const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel }));
const originalAnimate = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'animate',
);
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  reduced = false;
  cancel.mockClear();
  animate.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animate,
  });
});

afterEach(() => {
  cleanup();
  // Restore the globals so later suites in this worker see the real ones.
  if (originalAnimate) {
    Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  } else {
    delete (Element.prototype as { animate?: unknown }).animate;
  }
  window.matchMedia = originalMatchMedia;
});

describe('PinkWave', () => {
  it("draws the mark's seven trail dots, its core and both halo rings", () => {
    const { container } = render(<PinkWave />);
    expect(container.querySelectorAll('[data-part="dot"]')).toHaveLength(7);
    expect(container.querySelectorAll('[data-part="core"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-part="halo"]')).toHaveLength(2);
  });

  it('sizes its box for the bloom, so nothing paints outside it', () => {
    const { container } = render(<PinkWave scale="sm" />);
    const svg = container.querySelector('svg');
    // The outer halo (r 20) at its 1.35x bloom needs 54 units of height.
    expect(Number(svg?.getAttribute('height'))).toBeCloseTo(54);
    expect(svg?.style.overflow).toBe('');
  });

  it('turns each dot pink and has it blue again as the next dot lights', () => {
    render(<PinkWave />);
    // The trail dots animate first, smallest first.
    const calls = animate.mock.calls as unknown as [Keyframe[]][];
    const first = calls[0]![0];
    const second = calls[1]![0];
    const peak = first.find((frame) => frame.fill === 'var(--accent)');
    expect(peak?.transform).toBe('scale(1.3)');
    // Dot 0 lights at 80ms and is blue again at 112ms, when dot 1 lights.
    expect(first.map((frame) => frame.offset)).toEqual([
      0,
      80 / 1300,
      96 / 1300,
      112 / 1300,
      1,
    ]);
    expect(second[1]?.offset).toBe(112 / 1300);
  });

  it('loops every dot, the core and the halo on the 1300ms timeline', () => {
    render(<PinkWave />);
    expect(animate).toHaveBeenCalledTimes(10);
    for (const call of animate.mock.calls as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ][]) {
      expect(call[1]).toMatchObject({ duration: 1300, iterations: Infinity });
    }
  });

  it('holds still on the blue frame under reduced motion', () => {
    reduced = true;
    const { container } = render(<PinkWave />);
    expect(animate).not.toHaveBeenCalled();
    expect(container.querySelector('svg')?.dataset['pinkWave']).toBe('still');
    for (const circle of container.querySelectorAll(
      '[data-part="dot"], [data-part="core"]',
    )) {
      expect(circle.getAttribute('fill')).toBe('var(--signal)');
    }
  });

  it('cancels its animations on unmount', () => {
    const { unmount } = render(<PinkWave />);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(10);
  });

  it('is decorative', () => {
    const { container } = render(<PinkWave />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

describe('SkeletonBlock', () => {
  it('carries the app sweep and runs no animation of its own', () => {
    const { container } = render(<SkeletonBlock height={12} />);
    expect(container.querySelector('.dl-sweep')).not.toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});
