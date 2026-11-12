import { describe, expect, it } from 'vitest';
import {
  compareLeadingCounters,
  dropCheckedWhereLive,
  priceCheckFields,
} from './price-check-rules.js';

const counter = (
  id: string,
  corroborationCount: number,
  createdAt: string,
  userId: string | null = null,
) => ({ id, corroborationCount, createdAt: new Date(createdAt), userId });

describe('compareLeadingCounters', () => {
  it('puts the most confirmed update first', () => {
    const sorted = [
      counter('early', 1, '2027-01-01T00:00:00Z'),
      counter('confirmed', 2, '2027-01-02T00:00:00Z'),
    ].sort(compareLeadingCounters);
    expect(sorted.map((row) => row.id)).toEqual(['confirmed', 'early']);
  });

  it('breaks a confirmation tie on the earliest filed, then on id', () => {
    const sorted = [
      counter('b-later', 1, '2027-01-02T00:00:00Z'),
      counter('b-same', 1, '2027-01-01T00:00:00Z'),
      counter('a-same', 1, '2027-01-01T00:00:00Z'),
    ].sort(compareLeadingCounters);
    expect(sorted.map((row) => row.id)).toEqual([
      'a-same',
      'b-same',
      'b-later',
    ]);
  });
});

describe('priceCheckFields', () => {
  const counters = [
    counter('lead', 1, '2027-01-01T00:00:00Z', 'rae'),
    counter('second', 1, '2027-01-02T00:00:00Z', 'sam'),
  ];

  it('gives the parent submitter no action', () => {
    expect(
      priceCheckFields({
        viewerUserId: 'hugh',
        parentUserId: 'hugh',
        counters,
      }),
    ).toEqual({ pendingCount: 2, viewerAction: 'none', viewerCounterId: null });
  });

  it("lets an update's submitter withdraw their own, leading or not", () => {
    expect(
      priceCheckFields({ viewerUserId: 'sam', parentUserId: 'hugh', counters }),
    ).toEqual({
      pendingCount: 2,
      viewerAction: 'withdraw',
      viewerCounterId: 'second',
    });
  });

  it('offers anyone else, signed in or not, a new update', () => {
    for (const viewerUserId of ['other', null]) {
      expect(
        priceCheckFields({ viewerUserId, parentUserId: 'hugh', counters }),
      ).toEqual({
        pendingCount: 2,
        viewerAction: 'submit_update',
        viewerCounterId: null,
      });
    }
  });

  it('never matches a signed-out viewer to an anonymous parent', () => {
    expect(
      priceCheckFields({ viewerUserId: null, parentUserId: null, counters })
        .viewerAction,
    ).toBe('submit_update');
  });
});

describe('dropCheckedWhereLive', () => {
  it('drops a checked price only where its slot has a live one', () => {
    const rows = [
      { id: 'ga-live', tier: 'GA', contested: false },
      { id: 'ga-checked', tier: 'GA', contested: true },
      { id: 'vip-checked', tier: 'VIP', contested: true },
    ];
    expect(
      dropCheckedWhereLive(rows, (row) => row.tier).map((row) => row.id),
    ).toEqual(['ga-live', 'vip-checked']);
  });
});
