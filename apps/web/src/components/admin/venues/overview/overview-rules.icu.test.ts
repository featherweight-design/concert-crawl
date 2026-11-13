import { describe, it, expect, vi } from 'vitest';
import type * as TimeModule from '@/lib/time';

// Newer ICU builds format "3:02 AM" with a narrow no-break space (U+202F).
// This stands in for that build whatever ICU the test runner has, so the
// fold in `runWhen` is proven rather than assumed.
vi.mock('@/lib/time', async (importOriginal) => {
  const actual = await importOriginal<typeof TimeModule>();
  return {
    ...actual,
    formatISODate: (
      iso: string,
      timeZone: string,
      options?: Intl.DateTimeFormatOptions,
    ) =>
      options?.hour === undefined
        ? actual.formatISODate(iso, timeZone, options)
        : '3:02 AM',
  };
});

import { runWhen } from './overview-rules';

describe('runWhen on an ICU build with U+202F', () => {
  it('folds the narrow no-break space to a plain one', () => {
    expect(runWhen('2026-11-11T10:02:00.000Z')).toBe('Nov 11 · 3:02 AM');
  });
});
