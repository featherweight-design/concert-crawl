import { afterEach, describe, expect, it, vi } from 'vitest';
import { denverTodayUtcMs } from './time';

describe('denverTodayUtcMs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // 2026-11-10T04:30:00Z is 2026-11-09 21:30 in Denver (MST): UTC's own today
  // is already the 10th.
  it("is UTC midnight of Denver's date, not UTC's", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T04:30:00Z'));
    expect(new Date(denverTodayUtcMs()).toISOString()).toBe(
      '2026-11-09T00:00:00.000Z',
    );
  });
});
