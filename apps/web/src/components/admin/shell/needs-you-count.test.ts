import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiClient: { get } }));

import { fetchNeedsYouDecisions } from './needs-you-count';

describe('fetchNeedsYouDecisions', () => {
  it('returns the queue decision count, the one number for badge and summary', async () => {
    get.mockResolvedValue({ decisions: 138, byKind: {}, handledToday: 4 });
    await expect(fetchNeedsYouDecisions('t')).resolves.toBe(138);
    expect(get).toHaveBeenCalledWith('/v1/admin/needs-you/count', 't');
  });
});
