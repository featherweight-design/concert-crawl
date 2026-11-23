import { describe, expect, it } from 'vitest';

import { safeHref } from './safe-href';

describe('safeHref', () => {
  it('passes http and https URLs through', () => {
    expect(safeHref('https://commons.wikimedia.org/wiki/File:X.jpg')).toBe(
      'https://commons.wikimedia.org/wiki/File:X.jpg',
    );
    expect(safeHref('http://example.com/a')).toBe('http://example.com/a');
  });

  it('refuses other schemes, junk and empty values', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('not a url')).toBeNull();
    expect(safeHref('')).toBeNull();
    expect(safeHref(null)).toBeNull();
    expect(safeHref(undefined)).toBeNull();
  });
});
