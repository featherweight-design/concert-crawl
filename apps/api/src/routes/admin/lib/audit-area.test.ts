import { describe, it, expect } from 'vitest';
import { areaOfAction } from './audit-area.js';
import {
  PRICE_SETTINGS_UPDATE_ACTION,
  SETTINGS_UPDATE_ACTION,
} from './settings-audit.js';

describe('areaOfAction', () => {
  it('files a settings save by the page it was written for', () => {
    expect(areaOfAction(PRICE_SETTINGS_UPDATE_ACTION)).toBe('prices');
    expect(areaOfAction(SETTINGS_UPDATE_ACTION)).toBe('health');
  });

  it('reads every other action by its prefix', () => {
    expect(areaOfAction('venue.update')).toBe('venues');
    expect(areaOfAction('price.promoted')).toBe('prices');
    expect(areaOfAction('mystery')).toBeNull();
  });

  it('files a single-venue crawl under Venues and a crawl-all under Crawl runs', () => {
    expect(areaOfAction('crawl.trigger')).toBe('venues');
    expect(areaOfAction('crawl.trigger_all')).toBe('crawl-runs');
    expect(areaOfAction('crawl.trigger_trial')).toBe('venues');
  });

  it('never reads an override off the prototype', () => {
    expect(areaOfAction('toString')).toBeNull();
    expect(areaOfAction('constructor')).toBeNull();
  });
});
