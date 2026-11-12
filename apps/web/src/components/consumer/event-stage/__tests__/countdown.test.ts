import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as TimeModule from '@/lib/time';

// "Today" in the venue's zone, pinned so the counts are deterministic. The
// rest of the module stays real, and one case below swaps the real
// `localDateString` back in to exercise the venue-zone "today" itself.
vi.mock('@/lib/time', async (importOriginal) => ({
  ...(await importOriginal<typeof TimeModule>()),
  localDateString: vi.fn(() => '2026-11-09'),
}));

import { localDateString } from '@/lib/time';
import { daysUntilEvent, eventCountdown } from '../lib/countdown';
import { stageMetaLine, stageMetaParts } from '../lib/meta';
import { EVENT_STAGE_COPY } from '../definitions/copy';

const DENVER = 'America/Denver';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('daysUntilEvent', () => {
  it('counts whole calendar days from the venue today', () => {
    expect(daysUntilEvent('2026-11-09', DENVER)).toBe(0);
    expect(daysUntilEvent('2026-11-13', DENVER)).toBe(4);
    expect(daysUntilEvent('2026-11-08', DENVER)).toBe(-1);
  });
});

describe('eventCountdown', () => {
  it('says tonight, tomorrow, then counts the days', () => {
    expect(eventCountdown('2026-11-09', DENVER, 'upcoming')).toBe(
      EVENT_STAGE_COPY.countdown.tonight,
    );
    expect(eventCountdown('2026-11-10', DENVER, 'upcoming')).toBe(
      EVENT_STAGE_COPY.countdown.tomorrow,
    );
    expect(eventCountdown('2026-11-13', DENVER, 'upcoming')).toBe(
      '4 days away',
    );
  });

  it("takes today from the venue's zone, not UTC", async () => {
    const actual = await vi.importActual<typeof TimeModule>('@/lib/time');
    vi.mocked(localDateString).mockImplementationOnce(actual.localDateString);
    // 02:00 UTC on the 10th is still 7 PM on the 9th in Denver.
    vi.useFakeTimers({ now: new Date('2026-11-10T02:00:00Z') });
    expect(eventCountdown('2026-11-09', DENVER, 'upcoming')).toBe(
      EVENT_STAGE_COPY.countdown.tonight,
    );
  });

  it('counts a show that has passed: Yesterday, then N days ago, then the date', () => {
    expect(eventCountdown('2026-11-08', DENVER, 'upcoming')).toBe(
      EVENT_STAGE_COPY.countdown.yesterday,
    );
    expect(eventCountdown('2026-11-05', DENVER, 'upcoming')).toBe('4 days ago');
    // 30 days back is the last "days ago"; 31 reads the date itself.
    expect(eventCountdown('2026-10-10', DENVER, 'upcoming')).toBe(
      '30 days ago',
    );
    expect(eventCountdown('2026-10-09', DENVER, 'upcoming')).toBe('Oct 9');
  });

  it('draws nothing beside a cancelled or postponed status', () => {
    expect(eventCountdown('2026-11-13', DENVER, 'cancelled')).toBeNull();
    expect(eventCountdown('2026-11-13', DENVER, 'postponed')).toBeNull();
  });

  it('draws nothing for a date it cannot read', () => {
    expect(eventCountdown('not-a-date', DENVER, 'upcoming')).toBeNull();
  });
});

describe('stageMetaParts', () => {
  it("strikes a postponed show's old date and says the new one is not known", () => {
    expect(
      stageMetaParts('2026-12-17', DENVER, "Cervantes'", 'postponed'),
    ).toEqual({ struck: 'Thu Dec 17', text: "New date TBA · Cervantes'" });
  });

  it('keeps the whole line, struck-free, for every other status', () => {
    for (const status of ['upcoming', 'cancelled'] as const) {
      expect(
        stageMetaParts('2026-11-13', DENVER, 'The Church Nightclub', status),
      ).toEqual({
        struck: null,
        text: 'Fri Nov 13 · The Church Nightclub',
      });
    }
  });
});

describe('stageMetaLine', () => {
  it('reads weekday, month and day without a comma, then the venue', () => {
    expect(stageMetaLine('2026-11-13', DENVER, 'The Church Nightclub')).toBe(
      'Fri Nov 13 · The Church Nightclub',
    );
  });
});
