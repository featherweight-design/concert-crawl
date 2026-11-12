import { describe, expect, it, vi } from 'vitest';
import type { NeedsYouItem } from '@concert-crawl/types';

// Only the pure filter is under test; the loader's query is covered by the
// route integration test that arrives with the list.
vi.mock('@concert-crawl/db', () => ({ db: {}, adminQueueSnoozes: {} }));

import {
  filterSnoozed,
  isHidden,
  notUsefulKey,
  type ActiveSnoozes,
} from './snoozes.js';

const item = (
  over: Partial<Pick<NeedsYouItem, 'key' | 'venueId'>> & {
    kind?: 'bug' | 'venue-failing';
  } = {},
): NeedsYouItem => {
  const kind = over.kind ?? 'venue-failing';
  return {
    key: over.key ?? 'venue-failing:v1:1',
    kind,
    title: 'A venue',
    venueId: over.venueId === undefined ? 'v1' : over.venueId,
    venueName: 'Venue One',
    fanDate: null,
    watchers: 0,
    answers: [],
    ...(kind === 'bug'
      ? { feedbackId: 'f1', evidence: [] }
      : { cause: null, lastRuns: [], evidence: [] }),
  } as NeedsYouItem;
};

const none: ActiveSnoozes = { keys: new Set(), notUseful: new Set() };

describe('isHidden', () => {
  it('shows an item nobody snoozed', () => {
    expect(isHidden(item(), none)).toBe(false);
  });

  it('hides an item whose key is snoozed', () => {
    const snoozes = { ...none, keys: new Set(['venue-failing:v1:1']) };
    expect(isHidden(item(), snoozes)).toBe(true);
    expect(isHidden(item({ key: 'venue-failing:v1:2' }), snoozes)).toBe(false);
  });

  it('hides a kind for one venue only when marked Not useful', () => {
    const snoozes = {
      ...none,
      notUseful: new Set([notUsefulKey('venue-failing', 'v1')]),
    };
    expect(isHidden(item(), snoozes)).toBe(true);
    expect(isHidden(item({ venueId: 'v2' }), snoozes)).toBe(false);
    expect(isHidden(item({ kind: 'bug', venueId: 'v1' }), snoozes)).toBe(false);
  });

  it('never hides a venue-less item through Not useful', () => {
    const snoozes = {
      ...none,
      notUseful: new Set([notUsefulKey('bug', 'v1')]),
    };
    expect(isHidden(item({ kind: 'bug', venueId: null }), snoozes)).toBe(false);
  });
});

describe('filterSnoozed', () => {
  it('keeps the order of what stays', () => {
    const items = [
      item({ key: 'venue-failing:a:1', venueId: 'a' }),
      item({ key: 'venue-failing:b:1', venueId: 'b' }),
      item({ key: 'venue-failing:c:1', venueId: 'c' }),
    ];
    const snoozes = { ...none, keys: new Set(['venue-failing:b:1']) };
    expect(filterSnoozed(items, snoozes).map((row) => row.key)).toEqual([
      'venue-failing:a:1',
      'venue-failing:c:1',
    ]);
  });
});
