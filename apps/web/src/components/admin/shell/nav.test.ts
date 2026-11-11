import { describe, it, expect } from 'vitest';
import { NAV, badgeCountFor } from './nav';

describe('NAV config', () => {
  it('invite-codes item uses Key icon', () => {
    const item = NAV.find((navItem) => navItem.key === 'invite-codes');
    expect(item).toBeDefined();
    expect(item?.iconName).toBe('Key');
  });

  it('all operations items come before account items', () => {
    const sections = NAV.map((navItem) => navItem.section);
    const firstAccount = sections.indexOf('account');
    const lastOperations = sections.lastIndexOf('operations');
    expect(lastOperations).toBeLessThan(firstAccount);
  });

  it('dashboard is the first nav item', () => {
    expect(NAV[0]?.key).toBe('dashboard');
  });

  it('badges Artists with the open report count, in the warning colour', () => {
    const item = NAV.find((navItem) => navItem.key === 'artists');
    expect(item?.badge?.kind).toBe('warning');
    const counts = { crawl: 1, review: 2, feedback: 3, artists: 4 };
    expect(badgeCountFor('artists', counts)).toBe(4);
    expect(badgeCountFor('feedback', counts)).toBe(3);
    expect(badgeCountFor('artists', undefined)).toBe(0);
    expect(badgeCountFor('venues', counts)).toBe(0);
  });
});
