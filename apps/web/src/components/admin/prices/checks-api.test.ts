import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as CodesApi from '../invite-codes/codes-api';

const call = vi.fn();
vi.mock('../invite-codes/codes-api', async (importOriginal) => ({
  ...(await importOriginal<typeof CodesApi>()),
  call: (...args: unknown[]) => call(...args),
}));

import { checksApi } from './checks-api';

const ROW = {
  id: 'a-1',
  contestId: 'c-1',
  eventId: 'e-1',
  eventTitle: 'Clipse & J.I.D',
  eventDate: '2026-11-12',
  venueName: 'Red Rocks',
  resolution: 'challenger_wins',
  answer: 'used',
  price: '45.00',
  decidedBy: 'hugh',
  decidedByAvatar: { color: 'warning', secondColor: null },
  decidedAt: '2026-11-11T16:40:00.000Z',
  ticketUrl: 'https://tickets.example/clipse',
  note: 'Ticketmaster page shows $45 GA with fees.',
  parent: {
    id: 's-1',
    priceMin: '65.00',
    priceMax: '495.00',
    submittedBy: 'kmusic',
    corroborationCount: 2,
    note: null,
  },
  challenger: {
    id: 's-2',
    priceMin: '45.00',
    priceMax: null,
    submittedBy: 'theo.wav',
    corroborationCount: 1,
    note: 'fees in',
  },
  told: ['parent', 'challenger'],
  snapshot: true,
};

const api = checksApi(async () => 'token');
const answer = (items: unknown[]) =>
  call.mockResolvedValueOnce({ items, total: items.length });

afterEach(() => {
  call.mockReset();
});

describe('checksApi.resolved', () => {
  it('reads both sides, Told, the note and the decider’s colours', async () => {
    answer([ROW]);
    const page = await api.resolved(5, 5);
    expect(call.mock.calls[0]?.[1]).toBe(
      '/v1/admin/contests/prices/resolved?limit=5&offset=5',
    );
    expect(page.items[0]).toEqual({
      id: 'a-1',
      eventId: 'e-1',
      title: 'Clipse & J.I.D',
      venueName: 'Red Rocks',
      date: '2026-11-12',
      ticketUrl: 'https://tickets.example/clipse',
      answer: 'used',
      price: '45.00',
      decidedBy: 'hugh',
      decidedByAvatar: { color: 'warning', secondColor: null },
      decidedAt: '2026-11-11T16:40:00.000Z',
      note: 'Ticketmaster page shows $45 GA with fees.',
      parent: {
        priceMin: '65.00',
        priceMax: '495.00',
        handle: 'kmusic',
        confirmed: 2,
        note: null,
      },
      challenger: {
        priceMin: '45.00',
        priceMax: null,
        handle: 'theo.wav',
        confirmed: 1,
        note: 'fees in',
      },
      told: ['parent', 'challenger'],
      snapshot: true,
    });
  });

  it('takes null sides, Told and avatar, and draws an unknown colour as none', async () => {
    answer([
      {
        ...ROW,
        eventId: null,
        parent: null,
        challenger: null,
        told: null,
        decidedByAvatar: null,
      },
      {
        ...ROW,
        id: 'a-2',
        decidedByAvatar: { color: 'plaid', secondColor: null },
      },
    ]);
    const page = await api.resolved(0, 5);
    expect(page.items[0]).toMatchObject({
      eventId: null,
      parent: null,
      challenger: null,
      told: null,
      decidedByAvatar: null,
    });
    expect(page.items[1]?.decidedByAvatar).toEqual({
      color: null,
      secondColor: null,
    });
  });

  it.each([
    ['a Told role it does not know', { told: ['parent', 'venue'] }],
    [
      'a side with a text count',
      { parent: { ...ROW.parent, corroborationCount: '2' } },
    ],
    ['no snapshot flag', { snapshot: undefined }],
    ['a numeric ticket URL', { ticketUrl: 7 }],
  ])('fails the page on drift: %s', async (_name, drift) => {
    answer([{ ...ROW, ...drift }]);
    await expect(api.resolved(0, 5)).rejects.toThrow('checks');
  });
});
