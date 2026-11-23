import { describe, expect, it } from 'vitest';

import {
  FALLBACK_RETRY_AFTER_SECONDS,
  parseRetryAfterSeconds,
} from './retry-after';

describe('parseRetryAfterSeconds', () => {
  it('reads whole seconds', () => {
    expect(parseRetryAfterSeconds('900')).toBe(900);
  });

  it.each([null, 'soon', '0', '-5', ''])(
    'falls back to the full hour for %j',
    (header) => {
      expect(parseRetryAfterSeconds(header)).toBe(FALLBACK_RETRY_AFTER_SECONDS);
    },
  );
});
