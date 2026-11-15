// fetchHistory has no locked branch any more: every signed-in plan reads
// history, so a 403 is a real failure the caller must see, never a quiet
// "locked" result that renders an empty Concerts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient } from './api';
import { ENTITLEMENT_REQUIRED_CODE, fetchHistory } from './history';

describe('fetchHistory', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rethrows an entitlement 403 rather than resolving a locked result', async () => {
    const forbidden = new ApiError(403, 'Forbidden', ENTITLEMENT_REQUIRED_CODE);
    vi.spyOn(apiClient, 'get').mockRejectedValue(forbidden);

    await expect(fetchHistory('tok')).rejects.toBe(forbidden);
  });
});
