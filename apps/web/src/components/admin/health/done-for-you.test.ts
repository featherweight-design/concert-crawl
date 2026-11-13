import { describe, expect, it } from 'vitest';
import type { AuditLogItem } from '@concert-crawl/types';
import { DONE_ROW_LIMIT, doneForYouRows } from './done-for-you';
import { artistSyncRows } from './health-model';

let nth = 0;
const item = (patch: Partial<AuditLogItem>): AuditLogItem => {
  nth += 1;
  return {
    id: `row-${nth}`,
    actor: 'system:crawler',
    actorKind: 'system',
    action: 'venue.crawl_auto_paused',
    targetId: null,
    metadata: null,
    createdAt: `2026-11-12T09:${String(60 - nth).padStart(2, '0')}:00.000Z`,
    ...patch,
  };
};

describe('doneForYouRows', () => {
  it('reads a per-venue pause and merge on their own lines', () => {
    const rows = doneForYouRows([
      item({
        action: 'venue.crawl_auto_paused',
        metadata: { venueName: 'Junkyard', consecutiveFailures: 3 },
      }),
      item({
        action: 'event.drift_duplicates_merged',
        metadata: { venueName: 'Red Rocks', merged: 2 },
      }),
    ]);
    expect(rows.map((row) => row.text)).toEqual([
      'Paused crawling Junkyard after its 3rd failure',
      'Merged 2 duplicate listings at Red Rocks',
    ]);
  });

  it('collapses per-record actions into one counted line, at the newest time', () => {
    const first = item({ action: 'price.promoted', targetId: 'a' });
    const rows = doneForYouRows([
      first,
      item({ action: 'price.promoted', targetId: 'b' }),
      item({ action: 'price.promoted', targetId: 'c' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe('Published 3 prices a second fan confirmed');
    expect(rows[0]?.at).toBe(first.createdAt);
  });

  it('says one price in the singular', () => {
    expect(doneForYouRows([item({ action: 'price.promoted' })])[0]?.text).toBe(
      'Published 1 price a second fan confirmed',
    );
  });

  it('marks a counted line "N+" when the read was a full page', () => {
    const rows = doneForYouRows(
      [item({ action: 'event.auto_cancel.stale' })],
      true,
    );
    expect(rows[0]?.text).toBe(
      'Marked 1+ shows cancelled after the venue stopped listing them',
    );
  });

  it('leaves out admin rows, unknown actions and rows missing their facts', () => {
    expect(
      doneForYouRows([
        item({ actorKind: 'admin', action: 'price.promoted' }),
        item({ action: 'something.new' }),
        item({ action: 'venue.crawl_auto_paused', metadata: null }),
        item({
          action: 'event.drift_duplicates_merged',
          metadata: { venueName: 'Ogden', merged: 'x' },
        }),
      ]),
    ).toEqual([]);
  });

  it('keeps the newest rows when a night runs long', () => {
    const many = Array.from({ length: DONE_ROW_LIMIT + 3 }, (_, index) =>
      item({
        action: 'venue.crawl_blocked',
        metadata: { venueName: `Venue ${index}` },
      }),
    );
    expect(doneForYouRows(many)).toHaveLength(DONE_ROW_LIMIT);
  });
});

describe('artistSyncRows', () => {
  it('buckets the counts as the board does', () => {
    expect(
      artistSyncRows({
        matched: 1800,
        auto_matched: 42,
        to_check: 23,
        to_check_soon: 9,
        to_check_later: 10,
        to_check_none: 4,
        no_match: 177,
      }).map((row) => [row.key, row.count]),
    ).toEqual([
      ['matched', 1842],
      ['soon', 9],
      ['later', 14],
      ['none', 177],
    ]);
  });
});
