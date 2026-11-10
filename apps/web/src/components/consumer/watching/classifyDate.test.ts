import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyDate } from './WatchingContent';

describe('classifyDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // 2026-11-10T04:30:00Z is 2026-11-09 21:30 in Denver (MST) and already the
  // 10th for a viewer east of Denver or on UTC.
  it("buckets Denver's today as tonight whatever the viewer's clock says", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T04:30:00Z'));
    expect(classifyDate('2026-11-09')).toBe('tonight');
    expect(classifyDate('2026-11-10')).toBe('thisWeek');
  });

  it('names the month of a far-off show from its own date', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T04:30:00Z'));
    expect(classifyDate('2027-03-01')).toEqual({ month: 'March', year: 2027 });
  });
});
