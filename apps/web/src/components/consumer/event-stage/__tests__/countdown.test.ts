import { afterEach, describe, expect, it, vi } from 'vitest';

// "Today" in the venue's zone, pinned so the counts are deterministic.
vi.mock('@/lib/time', () => ({
  localDateString: () => '2026-11-09',
}));

import { daysUntilEvent, eventCountdown } from '../lib/countdown';
import { stageMetaLine } from '../lib/meta';
import { EVENT_STAGE_COPY } from '../definitions/copy';

const DENVER = 'America/Denver';

afterEach(() => {
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

  it('draws nothing for a show that has passed', () => {
    expect(eventCountdown('2026-11-08', DENVER, 'upcoming')).toBeNull();
  });

  it('draws nothing beside a cancelled or postponed status', () => {
    expect(eventCountdown('2026-11-13', DENVER, 'cancelled')).toBeNull();
    expect(eventCountdown('2026-11-13', DENVER, 'postponed')).toBeNull();
  });

  it('draws nothing for a date it cannot read', () => {
    expect(eventCountdown('not-a-date', DENVER, 'upcoming')).toBeNull();
  });
});

describe('stageMetaLine', () => {
  it('reads weekday, month and day without a comma, then the venue', () => {
    expect(stageMetaLine('2026-11-13', DENVER, 'The Church Nightclub')).toBe(
      'Fri Nov 13 · The Church Nightclub',
    );
  });
});
