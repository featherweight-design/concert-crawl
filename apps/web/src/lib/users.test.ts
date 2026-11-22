import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
vi.mock('./api', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

import { fetchMySubmissions } from './users';

describe('fetchMySubmissions art fields', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('fills null art for an API that predates the fields', async () => {
    get.mockResolvedValue([{ id: 'a', artist: 'Band' }]);
    const [row] = await fetchMySubmissions('token');
    expect(row).toMatchObject({
      id: 'a',
      imageUrl: null,
      artistPhotoUrl: null,
      genre: null,
    });
  });

  it('drops only the malformed field, keeping the rest', async () => {
    get.mockResolvedValue([
      {
        id: 'b',
        imageUrl: 42,
        artistPhotoUrl: 'https://img.example/p.jpg',
        genre: 'soul',
      },
    ]);
    const [row] = await fetchMySubmissions('token');
    expect(row).toMatchObject({
      imageUrl: null,
      artistPhotoUrl: 'https://img.example/p.jpg',
      genre: 'soul',
    });
  });

  it('drops a row that is not an object, keeping the rest of the list', async () => {
    get.mockResolvedValue([null, { id: 'c', genre: 'rock' }]);
    const rows = await fetchMySubmissions('token');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'c', genre: 'rock' });
  });
});
