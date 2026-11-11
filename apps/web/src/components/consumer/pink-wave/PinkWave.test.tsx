// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkeletonBlock } from '../skeleton/SkeletonBlock';
import { PinkWave } from './PinkWave';

let reduced = false;
const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel }));

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

afterEach(cleanup);

describe('PinkWave', () => {
  it('draws seven trail dots, a core and a halo', () => {
    const { container } = render(<PinkWave />);
    expect(container.querySelectorAll('circle')).toHaveLength(9);
  });

  it('loops every dot, the core and the halo on the 1300ms timeline', () => {
    render(<PinkWave />);
    expect(animate).toHaveBeenCalledTimes(9);
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
    for (const circle of container.querySelectorAll('circle')) {
      expect(circle.getAttribute('fill')).toBe('var(--signal)');
    }
  });

  it('cancels its animations on unmount', () => {
    const { unmount } = render(<PinkWave />);
    unmount();
    expect(cancel).toHaveBeenCalledTimes(9);
  });

  it('is decorative', () => {
    const { container } = render(<PinkWave />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});

describe('SkeletonBlock', () => {
  it('sweeps its sheen on --motion-slow', () => {
    render(<SkeletonBlock height={12} />);
    expect(animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 720, iterations: Infinity }),
    );
  });

  it('keeps the sheen still under reduced motion', () => {
    reduced = true;
    const { container } = render(<SkeletonBlock height={12} />);
    expect(animate).not.toHaveBeenCalled();
    expect(
      container
        .querySelector('[data-skeleton-sheen]')
        ?.getAttribute('data-skeleton-sheen'),
    ).toBe('still');
  });
});
