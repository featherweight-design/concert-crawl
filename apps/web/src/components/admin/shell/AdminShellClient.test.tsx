// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/venues/abc',
  useSearchParams: () => new URLSearchParams('tab=details'),
}));
vi.mock('@clerk/nextjs', () => ({ useClerk: () => ({ signOut: vi.fn() }) }));

import { DetailsSaveBar } from '@/components/admin/venues/details/DetailsSaveBar';
import { AdminShellClient } from './AdminShellClient';

const user = { firstName: 'Hugh', handle: 'hugh', email: 'h@x.test' };

// A desktop viewport: the phone query never matches.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    (
      query: string,
    ): Pick<
      MediaQueryList,
      'matches' | 'media' | 'addEventListener' | 'removeEventListener'
    > => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderShell = (children: React.ReactNode) =>
  render(
    <AdminShellClient user={user} badgeCounts={{ needsYou: 0 }}>
      {children}
    </AdminShellClient>,
  );

describe('AdminShellClient content pane slot', () => {
  it('lands the desktop Details save bar in the pane slot, past the page', async () => {
    renderShell(
      <div data-testid="page">
        <DetailsSaveBar
          phone={false}
          edited={1}
          saving={false}
          failure={null}
          onDiscard={vi.fn()}
          onSave={vi.fn()}
        />
      </div>,
    );
    const bar = await screen.findByTestId('details-save-bar');
    const slot = screen.getByTestId('admin-content-pane-slot');
    expect(bar.parentElement).toBe(slot);
    expect(screen.getByTestId('page').contains(bar)).toBe(false);
    // The slot is the scroller's last child, so the bar sticks to its bottom.
    expect(slot.parentElement?.tagName).toBe('MAIN');
    expect(slot.parentElement?.lastElementChild).toBe(slot);
  });

  it('leaves the slot empty and boxless on a page without a pane bar', async () => {
    renderShell(<div data-testid="page">A page</div>);
    await screen.findByTestId('admin-shell');
    const slot = screen.getByTestId('admin-content-pane-slot');
    expect(slot.childElementCount).toBe(0);
    // `display: contents` draws no box, so it adds no height to the pane.
    expect(slot.style.display).toBe('contents');
  });
});
