import { describe, it, expect } from 'vitest';
import { containsPattern, escapeLikePattern } from './escape-like.js';

describe('containsPattern', () => {
  it('escapes the term and wraps it in %', () => {
    expect(containsPattern('a_b')).toBe('%a\\_b%');
    expect(containsPattern('50%')).toBe('%50\\%%');
    expect(containsPattern('a\\b')).toBe('%a\\\\b%');
    expect(containsPattern('nirvana')).toBe('%nirvana%');
  });
});

describe('escapeLikePattern', () => {
  it('escapes %, _ and backslash with a backslash', () => {
    expect(escapeLikePattern('50%')).toBe('50\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
    expect(escapeLikePattern('%_\\')).toBe('\\%\\_\\\\');
  });

  it('leaves ordinary text unchanged', () => {
    expect(escapeLikePattern('nirvana')).toBe('nirvana');
    expect(escapeLikePattern('')).toBe('');
  });
});
