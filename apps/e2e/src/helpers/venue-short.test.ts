import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { VENUE_SUFFIX, venueShort } from './venue-short';

// The browse spec asserts the venue chip's label through this mirror, so a
// change to the web helper that this copy misses would fail only against
// staging, after merge. Reading the web source keeps the check on the PR.
const WEB_LIB = resolve(
  __dirname,
  '../../../web/src/components/consumer/definitions/lib.ts',
);

describe('venueShort mirror', () => {
  it('uses the same suffix pattern as the web helper', () => {
    const source = readFileSync(WEB_LIB, 'utf8');
    const start = source.indexOf('export function venueShort(');
    expect(start).toBeGreaterThanOrEqual(0);
    const body = source.slice(start, source.indexOf('\n}', start));
    expect(body).toContain(`/${VENUE_SUFFIX.source}/${VENUE_SUFFIX.flags}`);
  });

  it('drops a trailing venue-type word only', () => {
    expect(venueShort('Bluebird Theater')).toBe('Bluebird');
    expect(venueShort('Red Rocks Amphitheatre')).toBe('Red Rocks');
    expect(venueShort('Theater of the Mind')).toBe('Theater of the Mind');
  });
});
