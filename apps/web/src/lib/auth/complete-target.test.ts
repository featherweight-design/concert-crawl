import { describe, expect, it } from 'vitest';
import { completeTarget } from './complete-target';

describe('completeTarget', () => {
  it.each([
    [{}, '/auth/complete'],
    [{ redirect_url: '/e/abc' }, '/auth/complete?return=%2Fe%2Fabc'],
    [{ redirect_url: 'https://evil.test/x' }, '/auth/complete'],
    [
      { redirect_url: '/e/abc', tier: 'premium' },
      '/auth/complete?return=%2Fe%2Fabc&tier=premium',
    ],
    [{ tier: 'supporter' }, '/auth/complete?tier=supporter'],
    [
      { redirect_url: '/e/abc', tier: 'platinum' },
      '/auth/complete?return=%2Fe%2Fabc',
    ],
  ])('turns %j into %s', (params, expected) => {
    expect(completeTarget(params)).toBe(expected);
  });

  it('ignores a repeated redirect_url rather than guessing one', () => {
    expect(completeTarget({ redirect_url: ['/a', '/b'] })).toBe(
      '/auth/complete',
    );
  });

  it('drops an off-site or protocol-relative destination', () => {
    expect(completeTarget({ redirect_url: '//evil.test' })).toBe(
      '/auth/complete',
    );
  });
});
