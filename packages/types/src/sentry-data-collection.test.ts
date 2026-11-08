import { describe, expect, it } from 'vitest';

import { SENTRY_PRIVACY_OPTIONS } from './sentry-data-collection.js';

// Every leaf of dataCollection must be off: `false`, or an empty list for the
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

function frozenThroughout(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(frozenThroughout);
}

describe('SENTRY_PRIVACY_OPTIONS', () => {
  it.each(leaves(SENTRY_PRIVACY_OPTIONS.dataCollection, ''))(
    'dataCollection.%s is off',
    (_path, value) => {
      if (Array.isArray(value)) expect(value).toEqual([]);
      else expect(value).toBe(false);
    },
  );

  it('does not attach stack traces to messages', () => {
    expect(SENTRY_PRIVACY_OPTIONS.attachStacktrace).toBe(false);
  });

  it('is frozen at every level, so nothing can switch collection back on', () => {
    expect(frozenThroughout(SENTRY_PRIVACY_OPTIONS)).toBe(true);
  });
});
