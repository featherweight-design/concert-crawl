import { describe, expect, it } from 'vitest';
import { formatHandle } from './format-handle';

describe('formatHandle', () => {
  it('prefixes a bare handle', () => {
    expect(formatHandle('hugh')).toBe('@hugh');
  });
  it('does not double an existing @', () => {
    expect(formatHandle('@hugh')).toBe('@hugh');
  });
});
