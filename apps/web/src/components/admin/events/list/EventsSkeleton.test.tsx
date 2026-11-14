// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { EventsSkeleton } from './EventsSkeleton';

afterEach(cleanup);

// `__dirname`, not `import.meta.url`: under jsdom the module URL isn't a
// file: URL, so fileURLToPath throws.
const ADMIN_CSS = readFileSync(
  resolve(__dirname, '../../../../app/(protected)/admin/admin.css'),
  'utf8',
);

const rowsOf = (variant: HTMLElement, height: number) =>
  Array.from(variant.querySelectorAll<HTMLElement>('div')).filter(
    (el) => el.style.height === `${height}px`,
  );

// Card mode wraps the rows in a 14px-radius table card.
const hasCard = (variant: HTMLElement) =>
  Array.from(variant.querySelectorAll<HTMLElement>('div')).some(
    (el) => el.style.borderRadius === '14px',
  );

describe('EventsSkeleton', () => {
  it.each([false, true])(
    'draws plain rows on the phone (07/loading-any-list-on-mobile), rowsOnly=%s',
    (rowsOnly) => {
      render(<EventsSkeleton rowsOnly={rowsOnly} />);
      const phone = screen.getByTestId('events-skeleton-phone');
      expect(phone).toHaveClass('events-skeleton-phone');
      expect(hasCard(phone)).toBe(false);
      // Seven rows, 44px thumb with 12px above and below.
      expect(rowsOf(phone, 68)).toHaveLength(7);
    },
  );

  it.each([false, true])(
    'draws the table card on desktop (07/loading-events), rowsOnly=%s',
    (rowsOnly) => {
      render(<EventsSkeleton rowsOnly={rowsOnly} />);
      const desktop = screen.getByTestId('events-skeleton-desktop');
      expect(desktop).toHaveClass('events-skeleton-desktop');
      expect(hasCard(desktop)).toBe(true);
      expect(rowsOf(desktop, 65)).toHaveLength(8);
    },
  );

  it('shows one variant per side of the admin phone breakpoint', () => {
    expect(ADMIN_CSS).toMatch(/\.events-skeleton-phone \{\s*display: none;/);
    const phone =
      /@media \(max-width: 720px\) \{\s*\.events-skeleton-desktop \{\s*display: none;\s*\}\s*\.events-skeleton-phone \{\s*display: block;/;
    expect(ADMIN_CSS).toMatch(phone);
  });
});
