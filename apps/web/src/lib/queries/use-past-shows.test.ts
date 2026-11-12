import { describe, it, expect } from 'vitest';
import { pastShowsQueryKey } from './use-past-shows';

// The app-level QueryClient outlives sign-in sessions, so an unscoped key would
// serve one account's attendance flags to the next after a switch.
describe('pastShowsQueryKey', () => {
  it('scopes the cache entry by user', () => {
    expect(pastShowsQueryKey('user_a', 'all', '')).not.toEqual(
      pastShowsQueryKey('user_b', 'all', ''),
    );
  });

  it('keeps each scope and search term on its own entry', () => {
    expect(pastShowsQueryKey('user_a', 'all', '')).not.toEqual(
      pastShowsQueryKey('user_a', 'venues', ''),
    );
    expect(pastShowsQueryKey('user_a', 'all', 'a')).not.toEqual(
      pastShowsQueryKey('user_a', 'all', 'b'),
    );
  });

  it('collapses a missing user to a single signed-out entry', () => {
    expect(pastShowsQueryKey(undefined, 'all', '')).toEqual(
      pastShowsQueryKey(null, 'all', ''),
    );
  });
});
