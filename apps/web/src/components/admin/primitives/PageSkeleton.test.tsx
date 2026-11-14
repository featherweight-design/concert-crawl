// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { PageSkeleton, PHONE_VAR } from './PageSkeleton';

/** admin.css with its whitespace collapsed, for rule-level assertions. */
const ADMIN_CSS = readFileSync(
  path.resolve(__dirname, '../../../app/(protected)/admin/admin.css'),
  'utf8',
).replace(/\s+/g, ' ');

afterEach(cleanup);

// jsdom applies no stylesheet, so the breakpoint itself (admin.css) can't be
// exercised: these pin that both tails render, each with the class the
// breakpoint keys on, and the phone tail's drawn shape.
describe('PageSkeleton row tail (07/loading-any-list-on-mobile)', () => {
  it('renders the desktop pills side by side and the phone bar-over-pill stack', () => {
    render(<PageSkeleton rows={2} columns={4} rowHeight={64} />);
    const desktop = screen.getAllByTestId('page-skeleton-tail-desktop');
    const phone = screen.getAllByTestId('page-skeleton-tail-phone');
    expect(desktop).toHaveLength(2);
    expect(phone).toHaveLength(2);
    expect(desktop[0]).toHaveClass('page-skeleton-tail-desktop');
    // columns - 2 pills side by side on desktop.
    expect(desktop[0]?.children).toHaveLength(2);
    expect(phone[0]).toHaveClass('page-skeleton-tail-phone');
    expect(phone[0]?.style.flexDirection).toBe('column');
    expect(phone[0]?.style.alignItems).toBe('flex-end');
    expect(phone[0]?.style.gap).toBe('6px');
    // Inline display would beat the breakpoint's display: none.
    expect(phone[0]?.style.display).toBe('');
    expect(desktop[0]?.style.display).toBe('');
  });

  it('stacks a 48 × 11 bar over a 70 × 20 pill on the phone', () => {
    render(<PageSkeleton rows={1} columns={3} rowHeight={64} />);
    const [bar, pill] = Array.from(
      screen.getByTestId('page-skeleton-tail-phone').children,
    ).filter((el): el is HTMLElement => el instanceof HTMLElement);
    expect(bar?.style.width).toBe('48px');
    expect(bar?.style.height).toBe('11px');
    expect(bar?.style.borderRadius).toBe('6px');
    expect(pill?.style.width).toBe('70px');
    expect(pill?.style.height).toBe('20px');
    expect(pill?.style.borderRadius).toBe('999px');
  });

  it('draws no tail when the page has no value columns', () => {
    render(<PageSkeleton rows={1} columns={2} rowHeight={64} />);
    expect(screen.queryByTestId('page-skeleton-tail-phone')).toBeNull();
    expect(screen.queryByTestId('page-skeleton-tail-desktop')).toBeNull();
  });

  it('draws the phone board’s values through admin.css, keeping desktop’s as fallbacks', () => {
    // Desktop keeps its own boards' values as each var's fallback.
    expect(PHONE_VAR).toEqual({
      searchRadius: 'var(--page-skeleton-search-radius, 12px)',
      pillHeight: 'var(--page-skeleton-pill-height, 31px)',
      titleHeight: 'var(--page-skeleton-title-height, 12px)',
      subWidth: 'var(--page-skeleton-sub-width, 35%)',
      subRadius: 'var(--page-skeleton-sub-radius, 5px)',
      barGap: 'var(--page-skeleton-bar-gap, 8px)',
    });
    render(<PageSkeleton rows={1} columns={3} rowHeight={64} />);
    expect(screen.getByTestId('page-skeleton')).toHaveClass(
      'page-skeleton-plain',
    );
    // `07/loading-any-list-on-mobile`: search r10, pills 32, title bar 13,
    // second bar 40% at r6, the bars 7 apart.
    const phone =
      /@media \(max-width: 720px\) \{[^@]*?\.page-skeleton-plain \{([^}]*)\}/.exec(
        ADMIN_CSS,
      )?.[1];
    expect(phone).toContain('--page-skeleton-search-radius: 10px');
    expect(phone).toContain('--page-skeleton-pill-height: 32px');
    expect(phone).toContain('--page-skeleton-title-height: 13px');
    expect(phone).toContain('--page-skeleton-sub-width: 40%');
    expect(phone).toContain('--page-skeleton-sub-radius: 6px');
    expect(phone).toContain('--page-skeleton-bar-gap: 7px');
  });

  it('hides the desktop tail and shows the phone one at the breakpoint', () => {
    expect(ADMIN_CSS).toMatch(
      /@media \(max-width: 720px\) \{[^@]*?\.page-skeleton-tail-desktop \{ display: none; \}[^@]*?\.page-skeleton-tail-phone \{ display: flex; \}/,
    );
  });

  it('keeps the card rows’ own tail', () => {
    render(<PageSkeleton card rows={1} columns={5} rowHeight={65} />);
    expect(screen.queryByTestId('page-skeleton-tail-phone')).toBeNull();
  });

  it('keeps the phone values off card mode, which the board doesn’t draw', () => {
    render(<PageSkeleton card rows={1} columns={5} rowHeight={65} />);
    expect(screen.getByTestId('page-skeleton')).not.toHaveClass(
      'page-skeleton-plain',
    );
  });
});

describe('PageSkeleton a11y', () => {
  it('is a status announcing Loading, its blocks hidden', () => {
    render(<PageSkeleton rows={2} columns={3} rowHeight={64} />);
    const status = screen.getByRole('status');
    expect(status).toBe(screen.getByTestId('page-skeleton'));
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent(ADMIN_COPY.states.loading);
    expect(screen.getByText(ADMIN_COPY.states.loading)).toHaveClass('sr-only');
  });
});
