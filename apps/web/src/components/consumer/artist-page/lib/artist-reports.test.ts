import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ apiClient: api }));

import { fileArtistReport, withdrawArtistReport } from './artist-reports';

beforeEach(() => {
  api.post.mockReset();
  api.delete.mockReset();
});

describe('artist report requests', () => {
  it('files with POST on the artist reports path, slug encoded', async () => {
    api.post.mockResolvedValue({ id: 'rep_1' });

    await fileArtistReport('sigur rós', { reason: 'other' }, 'token');

    expect(api.post).toHaveBeenCalledWith(
      '/v1/artists/sigur%20r%C3%B3s/reports',
      'token',
      { reason: 'other' },
    );
  });

  it('withdraws with DELETE on reports/mine', async () => {
    api.delete.mockResolvedValue(undefined);

    await withdrawArtistReport('puma-blue', 'token');

    expect(api.delete).toHaveBeenCalledWith(
      '/v1/artists/puma-blue/reports/mine',
      'token',
    );
  });
});
