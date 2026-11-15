import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  adminFetch: (...args: unknown[]) => adminFetch(...args),
}));

import { addShowApi } from './add-show-api';
import { toBody, type AddShowDraft } from './add-show-rules';

const reply = (status: number, body: unknown) =>
  ({ status, json: async () => body }) satisfies Pick<
    Response,
    'status' | 'json'
  >;

const api = addShowApi(async () => 'token');
const DRAFT: AddShowDraft = {
  title: 'Kaleo',
  venueId: 'v1',
  date: '2026-12-04',
  doorsTime: null,
  showTime: null,
  ticketUrl: '',
  lineup: [{ name: 'Kaleo' }],
};

beforeEach(() => adminFetch.mockReset());

describe('addShowApi.create', () => {
  it('returns the new show on a 201', async () => {
    adminFetch.mockResolvedValue(
      reply(201, { success: true, data: { id: 'e1', title: 'Kaleo' } }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'created',
      id: 'e1',
    });
    const [url, init] = adminFetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/v1\/admin\/events$/);
    expect(init).toMatchObject({ method: 'POST' });
  });

  it('maps a 400 to its fields, by the first path segment', async () => {
    adminFetch.mockResolvedValue(
      reply(400, {
        success: false,
        error: {
          name: 'ZodError',
          issues: [
            { code: 'custom', path: ['date'], message: 'date_past' },
            {
              code: 'custom',
              path: ['lineup', 0, 'name'],
              message: 'lineup_name_invalid',
            },
            { code: 'custom', path: ['title'], message: 'not_a_code' },
          ],
        },
      }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'invalid',
      issues: [
        { field: 'date', code: 'date_past' },
        { field: 'lineup', code: 'lineup_name_invalid' },
      ],
    });
  });

  it('returns the existing show on the exact-key 409', async () => {
    adminFetch.mockResolvedValue(
      reply(409, { success: false, error: 'duplicate_show', existingId: 'e9' }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'duplicate',
      existingId: 'e9',
    });
  });

  it('throws on anything else, for Save failed', async () => {
    adminFetch.mockResolvedValue(reply(500, { success: false, error: 'boom' }));
    await expect(api.create(toBody(DRAFT))).rejects.toThrow();
    adminFetch.mockResolvedValue(reply(201, { success: true, data: {} }));
    await expect(api.create(toBody(DRAFT))).rejects.toThrow();
  });
});

describe('addShowApi reads', () => {
  it('reads the duplicates', async () => {
    const duplicates = [
      {
        id: 'e2',
        title: 'KALEO',
        showTime: null,
        manual: false,
        hidden: false,
      },
    ];
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: { duplicates } }),
    );
    await expect(
      api.duplicates({ venueId: 'v1', date: '2026-12-04', title: 'Kaleo' }),
    ).resolves.toEqual(duplicates);
    expect(String(adminFetch.mock.calls[0]?.[0])).toContain(
      '/v1/admin/events/duplicate?venueId=v1&date=2026-12-04&title=Kaleo',
    );
  });

  it('drops not-an-artist rows from the suggestions', async () => {
    adminFetch.mockResolvedValue(
      reply(200, {
        success: true,
        data: [
          { id: 'a1', name: 'Kaleo', matchStatus: 'matched' },
          { id: 'a2', name: 'Kaleo Live', matchStatus: 'not_an_artist' },
        ],
      }),
    );
    await expect(api.artists('kal')).resolves.toEqual([
      { id: 'a1', name: 'Kaleo' },
    ]);
  });

  it('fails a drifted venue list', async () => {
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: [{ id: 'v1' }] }),
    );
    await expect(api.venues()).rejects.toThrow();
  });
});
