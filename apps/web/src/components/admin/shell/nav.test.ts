import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  NAV,
  NAV_GROUPS,
  TAB_BAR,
  MORE_HREF,
  activeNavKey,
  activeTabKey,
  badgeCountFor,
} from './nav';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const ADMIN_APP_DIR = path.resolve(__dirname, '../../../app/(protected)/admin');

// The page for a URL, allowing a route group (`(list)/page.tsx`) directly
// under its folder, as People's list has.
const routeFileFor = (href: string): string => {
  const pathname = href.split('?')[0] ?? href;
  const rest = pathname.replace(/^\/admin\/?/, '');
  const dir = path.join(ADMIN_APP_DIR, rest);
  const direct = path.join(dir, 'page.tsx');
  if (existsSync(direct) || !existsSync(dir)) return direct;
  const group = readdirSync(dir).find(
    (name) =>
      /^\(.+\)$/.test(name) && existsSync(path.join(dir, name, 'page.tsx')),
  );
  return group ? path.join(dir, group, 'page.tsx') : direct;
};

describe('admin NAV', () => {
  it('orders the groups primary, manage, system with no group split', () => {
    const groups = NAV.map((item) => item.group);
    const order = groups.filter(
      (group, index) => index === 0 || groups[index - 1] !== group,
    );
    expect(order).toEqual(NAV_GROUPS);
  });

  it('lists the drawn order', () => {
    expect(NAV.map((item) => item.key)).toEqual([
      'needs-you',
      'health',
      'venues',
      'events',
      'artists',
      'prices',
      'people',
      'feature-flags',
      'crawl-runs',
      'operations',
    ]);
  });

  it.each([...NAV.map((item) => item.href), MORE_HREF])(
    'points %s at a route that exists',
    (href) => {
      expect(existsSync(routeFileFor(href))).toBe(true);
    },
  );

  it('badges only Needs you', () => {
    const counts = { needsYou: 14 };
    for (const item of NAV) {
      expect(badgeCountFor(item.key, counts)).toBe(
        item.key === 'needs-you' ? 14 : 0,
      );
    }
    expect(badgeCountFor('needs-you', undefined)).toBe(0);
  });

  it('never says Tools', () => {
    const source = readFileSync(path.join(__dirname, 'nav.ts'), 'utf8');
    expect(source).not.toMatch(/\btools\b/i);
    // Every shell string, including More's details and the tab bar.
    const shellCopy = JSON.stringify(
      ADMIN_COPY.shell,
      (_key, value: unknown) =>
        typeof value === 'function' ? String(value) : value,
    );
    expect(shellCopy).not.toMatch(/\btools\b/i);
  });

  it('has the 4-tab bar', () => {
    expect(TAB_BAR).toEqual(['needs-you', 'venues', 'events', 'more']);
  });
});

describe('activeNavKey', () => {
  const params = (query: string) => new URLSearchParams(query);

  it.each([
    ['/admin', '', 'health'],
    ['/admin/review', '', 'needs-you'],
    ['/admin/review', 'tab=missing', 'needs-you'],
    ['/admin/review', 'tab=all-events', 'events'],
    ['/admin/review', 'tab=prices', 'prices'],
    ['/admin/review', 'tab=submissions', 'prices'],
    ['/admin/review/contests/abc', '', 'needs-you'],
    ['/admin/events/abc/edit', '', 'events'],
    ['/admin/events/abc/edit', 'from=event-flags', 'needs-you'],
    ['/admin/events/abc/edit', 'from=all-events', 'events'],
    ['/admin/venues/abc', '', 'venues'],
    ['/admin/users/abc', '', 'people'],
    ['/admin/people', '', 'people'],
    ['/admin/people', 'code=abc', 'people'],
    // 5b: Codes and Posters are People's tabs, so People stays lit.
    ['/admin/people/invite-codes', '', 'people'],
    ['/admin/people/invite-codes/posters', 'code=abc', 'people'],
    ['/admin/crawl', '', 'crawl-runs'],
    ['/admin/feedback', '', 'operations'],
    ['/admin/feature-flags', '', 'feature-flags'],
    ['/admin/more', '', null],
    ['/admin/venuesx', '', null],
  ])('%s?%s is %s', (pathname, query, expected) => {
    expect(activeNavKey(pathname, params(query))).toBe(expected);
  });
});

describe('activeTabKey', () => {
  it('makes More active for a route outside the first three tabs', () => {
    expect(activeTabKey('/admin/feature-flags')).toBe('more');
    expect(activeTabKey('/admin/more')).toBe('more');
    expect(activeTabKey('/admin')).toBe('more');
  });

  it('keeps the first three tabs active on their own routes', () => {
    expect(activeTabKey('/admin/review')).toBe('needs-you');
    expect(activeTabKey('/admin/venues/abc')).toBe('venues');
    expect(activeTabKey('/admin/events/abc/edit')).toBe('events');
  });
});
