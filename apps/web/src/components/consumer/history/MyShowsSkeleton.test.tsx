// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type React from 'react';
import { rowFadeFor } from './MyShowsSkeleton';
import { HISTORY_COPY } from './definitions/copy';
import WatchingLoading from '@/app/(protected)/(main)/watching/loading';
import HistoryLoading from '@/app/(protected)/(main)/history/loading';
import FollowingLoading from '@/app/(protected)/(main)/following/loading';

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

afterEach(cleanup);

const TABS = HISTORY_COPY.tabs;

// B+ rule 9 and `06-states/bp-s-load_*_m`: the chrome is real, the data is a
// SkeletonBlock skeleton, and nothing rides the old skeletonPulse keyframes.
describe.each([
  ['Watching', WatchingLoading, TABS.watching, 4, 'pill'],
  ['Concerts', HistoryLoading, TABS.concerts, 4, 'stamp'],
  ['Artists', FollowingLoading, TABS.artists, 6, 'pill'],
] as const)('%s loading', (_name, Loading, tab, rows, trailing) => {
  it('renders the real sub-tab bar with its tab current', () => {
    render(<Loading />);
    expect(screen.getByRole('link', { name: tab })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('draws the drawn number of carded rows with the drawn trailing slot', () => {
    render(<Loading />);
    const skeletons = screen.getAllByTestId('my-shows-row-skeleton');
    expect(skeletons).toHaveLength(rows);
    for (const row of skeletons) {
      expect(row).toHaveAttribute('data-trailing', trailing);
    }
  });

  it('no longer uses the skeletonPulse keyframes', () => {
    const { container } = render(<Loading />);
    expect(container.innerHTML).not.toContain('skeletonPulse');
    expect(container.querySelectorAll('.dl-sweep').length).toBeGreaterThan(0);
  });
});

describe('rowFadeFor', () => {
  it('fades only the last two rows', () => {
    expect([0, 1, 2, 3, 4, 5].map((idx) => rowFadeFor(idx, 6))).toEqual([
      1, 1, 1, 1, 0.7, 0.4,
    ]);
  });
});
