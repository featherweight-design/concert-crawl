import { describe, it, expect } from 'vitest';
import { escapeLikePattern } from './escape-like.js';

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
