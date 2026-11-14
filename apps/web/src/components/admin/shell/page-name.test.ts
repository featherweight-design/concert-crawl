import { describe, expect, it } from 'vitest';
import { adminPageName } from './page-name';

describe('adminPageName', () => {
  // Codes and Posters live under People (5b), whose page title is People.
  it.each([
    '/admin/people',
    '/admin/people/invite-codes',
    '/admin/people/invite-codes/posters',
  ])('names %s People', (pathname) => {
    expect(adminPageName(pathname)).toBe('People');
  });

  it('has no name for the old invite-codes root, which only redirects', () => {
    expect(adminPageName('/admin/invite-codes')).toBeUndefined();
  });
});
