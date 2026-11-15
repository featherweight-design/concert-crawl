import { afterEach, describe, expect, it, vi } from 'vitest';
import { refusedCode, refusedStatus } from '../invite-codes/codes-api';
import { submittedApi } from './submitted-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

const apiRow = (extra: Record<string, unknown>) => ({
  id: 's-1',
  eventId: 'e-1',
  eventTitle: 'Vince Staples',
  eventDate: '2026-11-12',
  venueName: 'Fillmore',
  ticketUrl: null,
  priceMin: '50.00',
  priceMax: null,
  handle: 'dlo',
  backedBy: 1,
  state: 'waiting',
  ...extra,
});

const listWith = async (rows: unknown[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({ success: true, data: { rows, total: rows.length } }),
    ),
  );
  return submittedApi(async () => 'token').list('all', '', 0, 20);
};

describe('submitted prices avatar pair', () => {
  it('keeps a known pair, and turns an unknown or missing colour into null', async () => {
    const { rows } = await listWith([
      apiRow({ avatarColor: 'accent', avatarSecondColor: 'success' }),
      apiRow({ id: 's-2', avatarColor: 'plaid', avatarSecondColor: null }),
      // An API older than the pair sends neither field.
      apiRow({ id: 's-3' }),
    ]);
    expect(rows.map((row) => [row.avatarColor, row.avatarSecondColor])).toEqual(
      [
        ['accent', 'success'],
        [null, null],
        [null, null],
      ],
    );
  });
});

describe('submitted prices forYou flag', () => {
  it('reads forYou from the API, and an older API without it as yours', async () => {
    const { rows } = await listWith([
      apiRow({ forYou: true }),
      apiRow({ id: 's-2', forYou: false }),
      apiRow({ id: 's-3' }),
      apiRow({ id: 's-4', forYou: null }),
    ]);
    expect(rows.map((row) => row.forYou)).toEqual([true, false, true, true]);
  });
});

describe('submitted prices showOthers', () => {
  it("reads the show's other prices, and an older API without them as none", async () => {
    const { rows } = await listWith([
      apiRow({ showOthers: 2 }),
      apiRow({ id: 's-2', showOthers: 0 }),
      apiRow({ id: 's-3' }),
      apiRow({ id: 's-4', showOthers: 'many' }),
    ]);
    expect(rows.map((row) => row.showOthers)).toEqual([2, 0, 0, 0]);
  });
});

describe('the show filter', () => {
  const stubFetch = (data: unknown) => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ success: true, data }),
    );
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('sends eventId on the list only when set', async () => {
    const fetch = stubFetch({ rows: [], total: 0 });
    const api = submittedApi(async () => 'token');
    await api.list('all', '', 0, 20, null, 'e-1');
    await api.list('all', '', 0, 20);
    expect(fetch.mock.calls[0]![0]).toMatch(/&eventId=e-1&/);
    expect(fetch.mock.calls[1]![0]).not.toMatch(/eventId/);
  });

  it('sends eventId on the counts only when set', async () => {
    const fetch = stubFetch({
      all: 2,
      waiting: 1,
      published: 1,
      priceCheck: 0,
    });
    const api = submittedApi(async () => 'token');
    await api.counts('', null, 'e-1');
    await api.counts('');
    expect(fetch.mock.calls[0]![0]).toMatch(/state-counts\?eventId=e-1$/);
    expect(fetch.mock.calls[1]![0]).toMatch(/state-counts$/);
  });
});

describe('approve', () => {
  it('POSTs to the price’s approve route with no body', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ success: true, data: { id: 's-1' } }),
    );
    vi.stubGlobal('fetch', fetch);
    await submittedApi(async () => 'token').approve('s-1');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toMatch(/\/v1\/admin\/prices\/submissions\/s-1\/approve$/);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
  });

  it('carries a 409 not_waiting through to refusedStatus, as Reject does', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: false, code: 'not_waiting' }, { status: 409 }),
      ),
    );
    const err = await submittedApi(async () => 'token')
      .approve('s-1')
      .catch((caught: unknown) => caught);
    expect(refusedStatus(err)).toBe(409);
    expect(refusedCode(err)).toBe('not_waiting');
  });

  it('carries a 409 price_check code through to refusedCode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: false, code: 'price_check' }, { status: 409 }),
      ),
    );
    const err = await submittedApi(async () => 'token')
      .approve('s-1')
      .catch((caught: unknown) => caught);
    expect(refusedStatus(err)).toBe(409);
    expect(refusedCode(err)).toBe('price_check');
  });

  it('reads no code from a 404 without one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: false, error: 'gone' }, { status: 404 }),
      ),
    );
    const err = await submittedApi(async () => 'token')
      .approve('s-1')
      .catch((caught: unknown) => caught);
    expect(refusedStatus(err)).toBe(404);
    expect(refusedCode(err)).toBeNull();
  });
});
