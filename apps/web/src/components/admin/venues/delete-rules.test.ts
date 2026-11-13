import { describe, expect, it } from 'vitest';
import {
  deleteBlockersOf,
  deleteRefused,
  isVenueNotFound,
} from './delete-rules';

describe('deleteBlockersOf', () => {
  it('reads the three counts from the guard’s 409 body', () => {
    expect(
      deleteBlockersOf({
        success: false,
        code: 'has_history',
        pastShows: 12,
        upcomingShows: 0,
        watchers: 3,
      }),
    ).toEqual({ pastShows: 12, upcomingShows: 0, watchers: 3 });
  });

  it('is null unless all three are whole, non-negative numbers', () => {
    expect(deleteBlockersOf(null)).toBeNull();
    expect(deleteBlockersOf('409')).toBeNull();
    expect(deleteBlockersOf({ pastShows: 1, watchers: 0 })).toBeNull();
    expect(
      deleteBlockersOf({ pastShows: 1.5, upcomingShows: 0, watchers: 0 }),
    ).toBeNull();
    expect(
      deleteBlockersOf({ pastShows: -1, upcomingShows: 0, watchers: 0 }),
    ).toBeNull();
    expect(
      deleteBlockersOf({ pastShows: '1', upcomingShows: 0, watchers: 0 }),
    ).toBeNull();
  });
});

describe('isVenueNotFound', () => {
  it('is only the DELETE route’s own not-found body', () => {
    expect(isVenueNotFound({ success: false, error: 'Venue not found' })).toBe(
      true,
    );
    expect(isVenueNotFound({ success: false, error: 'Not Found' })).toBe(false);
    expect(isVenueNotFound('Venue not found')).toBe(false);
    expect(isVenueNotFound(null)).toBe(false);
  });
});

describe('deleteRefused', () => {
  it('refuses on any count above zero', () => {
    expect(deleteRefused({ pastShows: 1, upcomingShows: 0, watchers: 0 })).toBe(
      true,
    );
    expect(deleteRefused({ pastShows: 0, upcomingShows: 1, watchers: 0 })).toBe(
      true,
    );
    expect(deleteRefused({ pastShows: 0, upcomingShows: 0, watchers: 1 })).toBe(
      true,
    );
  });

  it('allows all zeros, and has nothing to refuse on with no counts', () => {
    expect(deleteRefused({ pastShows: 0, upcomingShows: 0, watchers: 0 })).toBe(
      false,
    );
    expect(deleteRefused(null)).toBe(false);
    expect(deleteRefused(undefined)).toBe(false);
  });
});
