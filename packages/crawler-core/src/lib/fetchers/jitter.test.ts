import { describe, it, expect, vi, afterEach } from 'vitest';
import { jitter } from './jitter.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('jitter', () => {
  it('never returns less than the configured delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(jitter(3000)).toBe(3000);
  });

  it('adds at most 999ms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(jitter(3000)).toBe(3999);
  });

  // Every crawl wait goes through jitter, so this is where the 3 second floor
  // holds for all of them: a zero or short delay is raised to it, not kept.
  it.each([0, 1000, 2999])(
    'floors a delay of %ims at 3000ms before adding jitter',
    (delayMs) => {
      for (const random of [0, 0.5, 0.9999]) {
        vi.spyOn(Math, 'random').mockReturnValue(random);
        const wait = jitter(delayMs);
        expect(wait).toBeGreaterThanOrEqual(3000);
        expect(wait).toBeLessThan(4000);
      }
    },
  );

  it('keeps a delay above the floor', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(jitter(5000)).toBeGreaterThanOrEqual(5000);
  });
});
