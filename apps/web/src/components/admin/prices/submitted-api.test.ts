import { afterEach, describe, expect, it, vi } from 'vitest';
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
