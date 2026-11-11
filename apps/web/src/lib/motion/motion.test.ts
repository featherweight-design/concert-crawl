// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { motionDurationMs, parseCssTimeMs, runMotion } from './index';

const setReducedMotion = (reduced: boolean) => {
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
};

afterEach(() => {
  document.documentElement.style.removeProperty('--motion-slow');
  document.documentElement.style.removeProperty('--motion-ease');
});

describe('parseCssTimeMs', () => {
  it('reads ms and s', () => {
    expect(parseCssTimeMs('720ms')).toBe(720);
    expect(parseCssTimeMs(' 0.72s ')).toBe(720);
    expect(parseCssTimeMs('fast')).toBeNull();
    expect(parseCssTimeMs('')).toBeNull();
  });
});

describe('motionDurationMs', () => {
  it('reads the token from the root', () => {
    document.documentElement.style.setProperty('--motion-slow', '900ms');
    expect(motionDurationMs('slow')).toBe(900);
  });

  it('falls back to the globals.css value when the token is unset', () => {
    expect(motionDurationMs('slow')).toBe(720);
  });
});

describe('runMotion', () => {
  const element = () => {
    const el = document.createElement('div');
    const animate = vi.fn().mockReturnValue({ cancel: vi.fn() });
    Object.defineProperty(el, 'animate', { value: animate });
    return { el, animate };
  };

  it('runs on token timing and easing', () => {
    setReducedMotion(false);
    document.documentElement.style.setProperty('--motion-ease', 'linear');
    const { el, animate } = element();
    runMotion(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 'slow' });
    expect(animate).toHaveBeenCalledWith(
      [{ opacity: 0 }, { opacity: 1 }],
      expect.objectContaining({ duration: 720, easing: 'linear' }),
    );
  });

  it('runs nothing under reduced motion', () => {
    setReducedMotion(true);
    const { el, animate } = element();
    expect(runMotion(el, [{ opacity: 1 }], { duration: 'fast' })).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it('runs nothing without the Web Animations API', () => {
    setReducedMotion(false);
    const el = document.createElement('div');
    Object.defineProperty(el, 'animate', { value: undefined });
    expect(runMotion(el, [{ opacity: 1 }], { duration: 'fast' })).toBeNull();
  });
});
