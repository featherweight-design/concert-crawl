import { afterEach, describe, expect, it, vi } from 'vitest';
import { isImminentEvent, todayInDenver } from './time.js';

// 2026-11-10T04:30:00Z is 2026-11-09 21:30 in Denver (MST, UTC-7).
const MT_EVENING = new Date('2026-11-10T04:30:00Z');

describe('Denver today', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is still the 9th on a Denver evening when UTC is already the 10th', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MT_EVENING);
    expect(todayInDenver()).toBe('2026-11-09');
  });

  it('treats a show dated Denver-today as imminent that evening', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(MT_EVENING);
    expect(isImminentEvent('2026-11-09', 0)).toBe(true);
    expect(isImminentEvent('2026-11-10', 0)).toBe(false);
    expect(isImminentEvent('2026-11-10', 1)).toBe(true);
  });
});
