// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const markOnboarded = vi.fn(async () => {});
vi.mock('./lib/use-mark-onboarded', () => ({
  useMarkOnboarded: () => markOnboarded,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  writePicks,
  readPicks,
} from '@/components/consumer/artist-picker';
import { SkipRail } from './SkipRail';

afterEach(() => {
  cleanup();
  push.mockClear();
  markOnboarded.mockReset().mockResolvedValue(undefined);
  window.sessionStorage.clear();
});

describe('SkipRail — three weights, one position (#794)', () => {
  it('renders a quiet mono link by default', () => {
    render(<SkipRail mode={{ kind: 'default', href: '/events' }} />);
    const skip = screen.getByRole('link', { name: /^skip$/i });
    expect(skip.getAttribute('href')).toBe('/events');
    // Quiet means no button chrome — a border here would read as a CTA.
    expect(skip.style.border).toBe('');
  });

  it('names the destination and goes loud mid-intent', () => {
    render(
      <SkipRail
        mode={{
          kind: 'mid-intent',
          destinationLabel: 'Geese',
          href: '/events/e1',
        }}
      />,
    );
    const skip = screen.getByRole('link', { name: /skip: back to geese/i });
    expect(skip.getAttribute('href')).toBe('/events/e1');
    expect(skip.style.border).toContain('var(--border-strong)');
  });

  it('states the pending action mid-intent so the tour explains itself', () => {
    render(
      <SkipRail
        mode={{
          kind: 'mid-intent',
          destinationLabel: 'Geese',
          href: '/events/e1',
        }}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe(
      "Watching Geese. We'll take you back",
    );
  });

  it('reads Close with no pending strip when entered from the account menu', () => {
    render(<SkipRail mode={{ kind: 'menu' }} />);
    expect(screen.getByRole('link', { name: /^close$/i })).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows no pending strip by default either', () => {
    render(<SkipRail mode={{ kind: 'default', href: '/events' }} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  // The mirrors survive the upgrade round-trip on purpose. Leaving on purpose
  // is the opposite of that, and a stale genre mirror would silently pre-filter
  // the next visit against buckets the lede promised we never saved.
  describe('leaving on purpose drops both pick mirrors', () => {
    it.each([
      ['default', { kind: 'default', href: '/events' }, /^skip$/i],
      ['menu', { kind: 'menu' }, /^close$/i],
      [
        'mid-intent',
        { kind: 'mid-intent', destinationLabel: 'Geese', href: '/events/e1' },
        /geese/i,
      ],
    ] as const)('on the %s exit', (_label, mode, name) => {
      writePicks(GENRE_PICKS_KEY, ['punk']);
      writePicks(ARTIST_PICKS_KEY, ['aa']);

      render(<SkipRail mode={mode} />);
      fireEvent.click(screen.getByRole('link', { name }));

      expect(readPicks(GENRE_PICKS_KEY)).toEqual([]);
      expect(readPicks(ARTIST_PICKS_KEY)).toEqual([]);
    });
  });

  // Skipping is done, like finishing: the proxy sends an unstamped new account
  // back to the tour, so the stamp has to land before the visitor leaves.
  describe('skipping records the tour as done (onboarding required)', () => {
    it('holds the navigation until the stamp lands, then goes', async () => {
      let release = () => {};
      markOnboarded.mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      render(<SkipRail mode={{ kind: 'default', href: '/events?tier=x' }} />);
      const link = screen.getByRole('link', { name: /^skip$/i });
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(markOnboarded).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
      release();
      await waitFor(() => expect(push).toHaveBeenCalledWith('/events?tier=x'));
    });

    it('leaves from the menu entry to the default path the same way', async () => {
      render(<SkipRail mode={{ kind: 'menu' }} />);
      fireEvent.click(screen.getByRole('link', { name: /^close$/i }));
      await waitFor(() => expect(push).toHaveBeenCalledWith('/events'));
      expect(markOnboarded).toHaveBeenCalledTimes(1);
    });

    it('lets a new-tab click through to the browser, still stamping', () => {
      render(<SkipRail mode={{ kind: 'default', href: '/events' }} />);
      const link = screen.getByRole('link', { name: /^skip$/i });
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        metaKey: true,
      });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(markOnboarded).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
    });
  });
});
