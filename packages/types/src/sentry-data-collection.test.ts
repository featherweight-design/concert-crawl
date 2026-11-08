import { describe, expect, it } from 'vitest';

import { SENTRY_DATA_COLLECTION } from './sentry-data-collection.js';

// Every leaf of the block must be off: `false`, or an empty list for the
// HTTP body targets. A switch flipped on, or a nested group gaining a `true`,
// would start sending personal data to Sentry.
function leaves(value: unknown, path: string): Array<[string, unknown]> {
  if (Array.isArray(value)) return [[path, value]];
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, path ? `${path}.${key}` : key),
    );
  }
  return [[path, value]];
}

describe('SENTRY_DATA_COLLECTION', () => {
  it.each(leaves(SENTRY_DATA_COLLECTION, ''))('%s is off', (_path, value) => {
    if (Array.isArray(value)) expect(value).toEqual([]);
    else expect(value).toBe(false);
  });

  it('covers every collection switch Sentry 11 has', () => {
    expect(Object.keys(SENTRY_DATA_COLLECTION).sort()).toEqual([
      'cookies',
      'databaseQueryData',
      'genAI',
      'graphQL',
      'httpBodies',
      'httpHeaders',
      'mcp',
      'queues',
      'stackFrameVariables',
      'urlQueryParams',
      'userInfo',
    ]);
  });

  it('cannot be switched on at runtime', () => {
    expect(Object.isFrozen(SENTRY_DATA_COLLECTION)).toBe(true);
  });
});
