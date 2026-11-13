import { describe, expect, it } from 'vitest';
import { VENUE_TABS, parseVenueTab, venueTabHref } from './venue-tabs';

describe('parseVenueTab', () => {
  it.each(VENUE_TABS)('reads ?tab=%s', (tab) => {
    expect(parseVenueTab(tab)).toBe(tab);
  });

  it('opens Overview with no tab', () => {
    expect(parseVenueTab(undefined)).toBe('overview');
  });

  it.each(['inspect', 'RUNS', '', 'history', ' runs'])(
    'opens Overview for an unknown tab %j rather than throwing',
    (raw) => {
      expect(parseVenueTab(raw)).toBe('overview');
    },
  );

  it('opens Overview for a repeated ?tab=', () => {
    expect(parseVenueTab(['runs', 'source'])).toBe('overview');
  });
});

describe('venueTabHref', () => {
  it('points at the venue page with the tab', () => {
    expect(venueTabHref('v-1', 'source')).toBe('/admin/venues/v-1?tab=source');
  });
});
