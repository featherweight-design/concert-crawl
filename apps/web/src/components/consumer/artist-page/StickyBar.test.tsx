// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ARTIST_COPY } from './definitions/copy';
import { StickyBar } from './StickyBar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/wax-harbour',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}));

afterEach(cleanup);

describe('StickyBar', () => {
  it('renders nothing until the plate has scrolled past', () => {
    const { container } = render(
      <StickyBar name="Wax Harbour" visible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('is a 56px bar carrying back and the name', () => {
    const { container, getByText } = render(
      <StickyBar name="Wax Harbour" visible />,
    );
    const bar = container.querySelector('[data-sticky-bar]');
    expect(bar).not.toBeNull();
    // Mobile-only: the handoff is explicit that there is no desktop sub-header.
    expect(bar?.className).toContain('lg:hidden');
    const style = bar?.getAttribute('style') ?? '';
    // 56px of bar below the status-bar inset (viewport-fit=cover).
    expect(style).toContain('height: calc(56px + env(safe-area-inset-top');
    expect(style).toContain('var(--bg)');
    expect(getByText('Wax Harbour')).not.toBeNull();
  });

  // Addendum 2, item 27: Follow stays under the hero and is not sticky.
  it('never carries a follow control', () => {
    const { queryByRole } = render(<StickyBar name="Wax Harbour" visible />);
    for (const label of [
      ARTIST_COPY.followAria('Wax Harbour'),
      ARTIST_COPY.followingAria('Wax Harbour'),
      ARTIST_COPY.followSignedOutAria('Wax Harbour'),
    ]) {
      expect(queryByRole('button', { name: label })).toBeNull();
    }
  });
});
