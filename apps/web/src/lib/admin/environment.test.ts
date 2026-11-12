import { describe, it, expect } from 'vitest';
import { adminEnvironment } from './environment';

describe('adminEnvironment', () => {
  it.each([
    ['production', 'production'],
    ['staging', 'staging'],
    ['local', 'local'],
    ['development', 'local'],
    [undefined, 'local'],
  ] as const)('maps %s to %s', (value, expected) => {
    expect(adminEnvironment(value)).toBe(expected);
  });
});
