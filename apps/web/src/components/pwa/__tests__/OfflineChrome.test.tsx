// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

// The point of this chrome is that nothing in it is live: no Clerk, no React
// Query, no account-menu provider. Rendering it with none of them mounted and
// no router mock is the test.
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

import { OfflineChrome } from '../OfflineChrome';

afterEach(cleanup);

const NAV = CONSUMER_COPY.bottomNav.nav;

describe('OfflineChrome', () => {
  it('renders without any provider mounted', () => {
    expect(() => render(<OfflineChrome />)).not.toThrow();
  });

  it('draws the brand header linking home', () => {
    render(<OfflineChrome />);
    const header = screen.getByTestId('offline-header');
    expect(within(header).getByRole('link')).toHaveAttribute('href', '/');
    expect(header).toHaveTextContent(
      `${CONSUMER_COPY.appHeader.brand.name}${CONSUMER_COPY.appHeader.brand.accent}`,
    );
  });

  it('draws the four tabs as plain links, Browse current, and no search', () => {
    render(<OfflineChrome />);
    const nav = screen.getByRole('navigation', { name: NAV.ariaLabel });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      NAV.tabs.map((tab) => tab.href),
    );
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(
      links.slice(1).every((link) => !link.hasAttribute('aria-current')),
    ).toBe(true);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps the fifth slot as a neutral, non-interactive circle', () => {
    render(<OfflineChrome />);
    const disc = screen.getByTestId('offline-account-disc');
    expect(disc).toHaveAttribute('aria-hidden', 'true');
    expect(disc).toHaveTextContent('');
    expect(within(disc).queryByRole('button')).toBeNull();
  });
});
