import { describe, expect, it } from 'vitest';
import {
  VENUE_TABS,
  parseVenueRun,
  parseVenueTab,
  venueRunHref,
  venueTabHref,
} from './venue-tabs';

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

describe('parseVenueRun', () => {
  const RUN_ID = '0b7c6f3e-8d2a-4c1b-9e5f-1a2b3c4d5e6f';

  it('reads a run id', () => {
    expect(parseVenueRun(RUN_ID)).toBe(RUN_ID);
  });

  it.each([undefined, '', 'run-1', `${RUN_ID} `, [RUN_ID, RUN_ID]])(
    'opens no run for %j rather than throwing',
    (raw) => {
      expect(parseVenueRun(raw)).toBeNull();
    },
  );
});

describe('venueTabHref', () => {
  it('points at the venue page with the tab', () => {
    expect(venueTabHref('v-1', 'source')).toBe('/admin/venues/v-1?tab=source');
  });
});

describe('venueRunHref', () => {
  it('points at the Runs tab with the run, encoded', () => {
    expect(venueRunHref('v-1', 'r 1')).toBe(
      '/admin/venues/v-1?tab=runs&run=r%201',
    );
  });
});
