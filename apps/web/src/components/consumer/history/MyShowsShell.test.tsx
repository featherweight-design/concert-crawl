// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type React from 'react';
import { HISTORY_COPY } from './definitions/copy';
import { isMyShowsPath, myShowsTabFor, MyShowsShell } from './MyShowsShell';
import MyShowsLayout from '@/app/(protected)/(main)/(my-shows)/layout';

const pathname = vi.hoisted(() => ({ current: '/watching' }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

const token = vi.hoisted(() => ({ current: 'token' as string | null }));
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: async () => token.current }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  pathname.current = '/watching';
  token.current = 'token';
});

const TABS = HISTORY_COPY.tabs;

const renderLayout = async () =>
  render(await MyShowsLayout({ children: <p>page body</p> }));

describe('myShowsTabFor', () => {
  it.each([
    ['/watching', 'watching'],
    ['/history', 'history'],
    ['/following', 'artists'],
    ['/following/anything', 'artists'],
    [null, 'watching'],
  ] as const)('maps %s to %s', (input, tab) => {
    expect(myShowsTabFor(input)).toBe(tab);
  });
});

describe('isMyShowsPath', () => {
  it.each([
    ['/watching', true],
    ['/history', true],
    ['/following', true],
    ['/events', false],
    ['/watchingx', false],
    [null, false],
  ] as const)('%s is %s', (input, expected) => {
    expect(isMyShowsPath(input)).toBe(expected);
  });
});

// The regression: each route drew its own bar inside its own column, so the
// bar remounted and moved on every tab switch. The layout owns it now.
describe('My shows layout', () => {
  it.each([
    ['/watching', TABS.watching],
    ['/history', TABS.concerts],
    ['/following', TABS.artists],
  ] as const)(
    'draws the sub-tab bar above the page on %s',
    async (path, tab) => {
      pathname.current = path;
      await renderLayout();

      const nav = screen.getByRole('navigation', { name: TABS.ariaLabel });
      const body = screen.getByText('page body');
      expect(nav.compareDocumentPosition(body)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(screen.getByRole('link', { name: tab })).toHaveAttribute(
        'aria-current',
        'page',
      );
    },
  );

  it('puts the bar and the page in one column for all three tabs', async () => {
    await renderLayout();
    const shell = screen.getByTestId('my-shows-shell');
    expect(shell).toContainElement(
      screen.getByRole('navigation', { name: TABS.ariaLabel }),
    );
    expect(shell).toContainElement(screen.getByText('page body'));
  });

  it('keeps the same bar node across a tab switch', async () => {
    pathname.current = '/watching';
    const view = render(
      <MyShowsShell signedIn>
        <p>page body</p>
      </MyShowsShell>,
    );
    const before = screen.getByRole('navigation', { name: TABS.ariaLabel });

    pathname.current = '/history';
    view.rerender(
      <MyShowsShell signedIn>
        <p>other page</p>
      </MyShowsShell>,
    );

    const after = screen.getByRole('navigation', { name: TABS.ariaLabel });
    expect(after).toBe(before);
    expect(screen.getByRole('link', { name: TABS.concerts })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('draws no bar on signed-out Watching, the teaching state', async () => {
    token.current = null;
    await renderLayout();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('keeps the bar on a protected tab without a token, as the way out', async () => {
    token.current = null;
    pathname.current = '/following';
    await renderLayout();
    expect(
      screen.getByRole('navigation', { name: TABS.ariaLabel }),
    ).toBeInTheDocument();
  });
});

describe('My shows pages', () => {
  const consumer = path.resolve(__dirname, '..');
  const routes = path.resolve(
    __dirname,
    '../../../app/(protected)/(main)/(my-shows)',
  );
  it.each([
    path.join(consumer, 'watching/WatchingContent.tsx'),
    path.join(consumer, 'history/HistoryContent.tsx'),
    path.join(consumer, 'following/my-shows/MyShowsArtistsContent.tsx'),
    path.join(routes, 'watching/loading.tsx'),
    path.join(routes, 'history/loading.tsx'),
    path.join(routes, 'following/loading.tsx'),
  ])('%s draws no sub-tab bar of its own', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/<MyShowsTabs\b/);
  });
});
