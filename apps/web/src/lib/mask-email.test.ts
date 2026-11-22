import { describe, expect, it } from 'vitest';

import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('keeps the first character and the domain, as the settings board draws it', () => {
    expect(maskEmail('hugh@gmail.com')).toBe('h•••••@gmail.com');
  });

  it('uses five bullets whatever the local part length', () => {
    expect(maskEmail('a@x.co')).toBe('a•••••@x.co');
    expect(maskEmail('averyverylongname@x.co')).toBe('a•••••@x.co');
  });

  it('masks from the last @', () => {
    expect(maskEmail('a@b@example.com')).toBe('a•••••@example.com');
  });

  it('shows nothing for an empty email', () => {
    expect(maskEmail('')).toBe('');
  });

  it('never prints a value with no usable @', () => {
    expect(maskEmail('not-an-email')).toBe('•••••');
    expect(maskEmail('@example.com')).toBe('•••••');
  });
});
