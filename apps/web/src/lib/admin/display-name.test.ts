import { describe, it, expect } from 'vitest';
import { displayNameFor } from '@/components/admin/shell/AdminAvatar';

describe('displayNameFor', () => {
  it.each([
    [{ firstName: 'Hugh', handle: 'hugh', email: 'hugh@x.test' }, 'Hugh'],
    [{ firstName: '  ', handle: 'hugh', email: 'hugh@x.test' }, '@hugh'],
    [{ firstName: null, handle: null, email: 'hugh@x.test' }, 'hu•••'],
  ])('%o reads %s, never the address', (user, expected) => {
    expect(displayNameFor(user)).toBe(expected);
    expect(displayNameFor(user)).not.toContain('@x.test');
  });
});
