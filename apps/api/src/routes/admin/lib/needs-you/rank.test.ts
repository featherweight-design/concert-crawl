import { describe, expect, it } from 'vitest';
import { rankNeedsYou } from './rank.js';
import type { NeedsYouItem } from '@concert-crawl/types';

const item = (
  key: string,
  fanDate: string | null,
  watchers = 0,
): NeedsYouItem => ({
  key,
  kind: 'bug',
  title: key,
  venueId: null,
  venueName: null,
  fanDate,
  watchers,
  answers: [],
  feedbackId: key,
  evidence: [],
});

describe('rankNeedsYou', () => {
  it('orders by fan date ascending with undated items last', () => {
    const ranked = rankNeedsYou([
      item('bug:undated', null),
      item('bug:later', '2030-02-01'),
      item('bug:sooner', '2030-01-01'),
    ]);
    expect(ranked.map((row) => row.key)).toEqual([
      'bug:sooner',
      'bug:later',
      'bug:undated',
    ]);
  });

  it('breaks date ties by watchers descending, then by key', () => {
    const ranked = rankNeedsYou([
      item('bug:b', '2030-01-01', 3),
      item('bug:c', '2030-01-01', 9),
      item('bug:a', '2030-01-01', 3),
    ]);
    expect(ranked.map((row) => row.key)).toEqual(['bug:c', 'bug:a', 'bug:b']);
  });

  it('does not mutate its input', () => {
    const input = [item('bug:b', '2030-02-01'), item('bug:a', '2030-01-01')];
    rankNeedsYou(input);
    expect(input[0]?.key).toBe('bug:b');
  });
});
