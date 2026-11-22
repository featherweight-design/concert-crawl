import { describe, expect, it } from 'vitest';

import { maskAccountEmail } from './mask-account-email';

describe('maskAccountEmail', () => {
  it('keeps the first character and the domain, as the settings board draws it', () => {
    expect(maskAccountEmail('hugh@gmail.com')).toBe('h•••••@gmail.com');
  });

  it('uses five bullets whatever the local part length', () => {
    expect(maskAccountEmail('a@x.co')).toBe('a•••••@x.co');
    expect(maskAccountEmail('averyverylongname@x.co')).toBe('a•••••@x.co');
  });

  it('masks from the last @', () => {
    expect(maskAccountEmail('a@b@example.com')).toBe('a•••••@example.com');
  });

  it('shows nothing for an empty email', () => {
    expect(maskAccountEmail('')).toBe('');
  });

  it('never prints a value with no usable @', () => {
    expect(maskAccountEmail('not-an-email')).toBe('•••••');
    expect(maskAccountEmail('@example.com')).toBe('•••••');
  });
});
