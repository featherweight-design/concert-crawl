import { describe, it, expect } from 'vitest';
import { isTabActive } from './nav-tab-active';

describe('isTabActive', () => {
  it('falls back to the href when a tab declares no prefixes', () => {
    const tab = { href: '/venues' };
    expect(isTabActive(tab, '/venues/bluebird')).toBe(true);
    expect(isTabActive(tab, '/events')).toBe(false);
  });

  it('lights Browse, not a tab of its own, on an artist page', () => {
    const browse = { href: '/events', matchPrefixes: ['/artists'] };
    expect(isTabActive(browse, '/artists/some-band')).toBe(true);
    expect(isTabActive({ href: '/venues' }, '/artists/some-band')).toBe(false);
  });

  it('treats matchPrefixes as additive to the href', () => {
    const tab = { href: '/watching', matchPrefixes: ['/history'] };
    expect(isTabActive(tab, '/watching')).toBe(true);
    expect(isTabActive(tab, '/history')).toBe(true);
    expect(isTabActive(tab, '/events')).toBe(false);
  });
});
