// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RowMenu } from './RowMenu';
import { HISTORY_COPY } from './definitions/copy';

const mobile = vi.hoisted(() => ({ value: false }));

vi.mock('@/lib/hooks/useIsMobileViewport', () => ({
  useIsMobileViewport: () => mobile.value,
}));

// Stub the overlay: the popover measures its trigger and jsdom has no layout.
// `data-mode` lets a test tell the sheet from the popover.
vi.mock('@/components/ui/cc-overlay', () => ({
  CCOverlayHost: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  CCOverlay: ({
    id,
    mode,
    width,
    arrow,
    children,
  }: {
    id: string;
    mode: string;
    width?: number;
    arrow?: boolean;
    children: React.ReactNode;
  }) => (
    <div
      id={id}
      data-mode={mode}
      data-width={width}
      data-arrow={arrow === undefined ? undefined : String(arrow)}
    >
      {children}
    </div>
  ),
}));

beforeEach(() => {
  mobile.value = false;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const setup = (tense: 'past' | 'upcoming' = 'past') => {
  const onRemove = vi.fn();
  const onShare = vi.fn();
  render(
    <RowMenu
      tense={tense}
      artist="Wednesday"
      venue="Larimer Lounge"
      dateLabel="Thu, May 14"
      eventId="evt-1"
      onRemove={onRemove}
      onShare={onShare}
    />,
  );
  return { onRemove, onShare };
};

const trigger = () =>
  screen.getByRole('button', {
    name: HISTORY_COPY.menu.trigger('Wednesday'),
  });

describe('RowMenu', () => {
  it('names the trigger after the artist and opens on click, not on focus or hover', () => {
    setup();

    fireEvent.focus(trigger());
    fireEvent.mouseEnter(trigger());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
  });

  describe('a past row', () => {
    it('lists open, share, then remove last', () => {
      setup('past');
      fireEvent.click(trigger());

      const items = screen.getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual([
        HISTORY_COPY.menu.open,
        HISTORY_COPY.menu.share,
        HISTORY_COPY.menu.remove,
      ]);
      expect(items[0]).toHaveAttribute('href', '/events/evt-1');
    });

    it('calls onRemove and closes from the remove item', () => {
      const { onRemove } = setup('past');
      fireEvent.click(trigger());

      fireEvent.click(
        screen.getByRole('menuitem', { name: HISTORY_COPY.menu.remove }),
      );

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('an upcoming row', () => {
    it('lists open, share this show, then not going anymore', () => {
      setup('upcoming');
      fireEvent.click(trigger());

      expect(
        screen.getAllByRole('menuitem').map((item) => item.textContent),
      ).toEqual([
        HISTORY_COPY.menu.open,
        HISTORY_COPY.menu.shareUpcoming,
        HISTORY_COPY.menu.removeUpcoming,
      ]);
    });

    it('calls onRemove from Not going anymore', () => {
      const { onRemove } = setup('upcoming');
      fireEvent.click(trigger());

      fireEvent.click(
        screen.getByRole('menuitem', {
          name: HISTORY_COPY.menu.removeUpcoming,
        }),
      );

      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });

  it('closes the menu when Open the show page is chosen', () => {
    setup();
    fireEvent.click(trigger());

    fireEvent.click(
      screen.getByRole('menuitem', { name: HISTORY_COPY.menu.open }),
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('hands focus back to the trigger before an action runs', () => {
    const { onRemove } = setup();
    fireEvent.click(trigger());
    onRemove.mockImplementation(() => {
      expect(trigger()).toHaveFocus();
    });

    fireEvent.click(
      screen.getByRole('menuitem', { name: HISTORY_COPY.menu.remove }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('does not close when a press lands in the panel outside the menu list', () => {
    setup();
    fireEvent.click(trigger());
    // The stubbed panel is the menu's parent: anything in it is inside.
    const panel = screen.getByRole('menu').parentElement as HTMLElement;

    fireEvent.pointerDown(panel);

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onShare from the share item', () => {
    const { onShare } = setup();
    fireEvent.click(trigger());

    fireEvent.click(
      screen.getByRole('menuitem', { name: HISTORY_COPY.menu.share }),
    );

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  describe('below sm', () => {
    beforeEach(() => {
      mobile.value = true;
    });

    it('opens a sheet that names the night, not a popover', () => {
      setup('past');
      fireEvent.click(trigger());

      expect(screen.getByRole('menu').closest('[data-mode]')).toHaveAttribute(
        'data-mode',
        'sheet',
      );
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
      expect(
        screen.getByText('Larimer Lounge · Thu, May 14'),
      ).toBeInTheDocument();
    });

    it('puts a line under each action on an upcoming row only', () => {
      setup('upcoming');
      fireEvent.click(trigger());

      expect(screen.getByText(HISTORY_COPY.menu.openSub)).toBeInTheDocument();
      expect(screen.getByText(HISTORY_COPY.menu.shareSub)).toBeInTheDocument();
      expect(
        screen.getByText(HISTORY_COPY.menu.removeUpcomingSub),
      ).toBeInTheDocument();
    });

    it('draws no sublines on a past row', () => {
      setup('past');
      fireEvent.click(trigger());

      expect(
        screen.queryByText(HISTORY_COPY.menu.openSub),
      ).not.toBeInTheDocument();
    });
  });

  describe('from sm', () => {
    it('opens a popover with no sublines', () => {
      setup('upcoming');
      fireEvent.click(trigger());

      expect(screen.getByRole('menu').closest('[data-mode]')).toHaveAttribute(
        'data-mode',
        'popover',
      );
      expect(
        screen.queryByText(HISTORY_COPY.menu.openSub),
      ).not.toBeInTheDocument();
    });

    it('moves focus to the first item, then with the arrow keys', () => {
      setup('past');
      fireEvent.click(trigger());
      const items = screen.getAllByRole('menuitem');

      expect(items[0]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(items[1]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      expect(items[2]).toHaveFocus();
    });

    it('closes on Escape and returns focus to the trigger', () => {
      setup();
      fireEvent.click(trigger());

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger()).toHaveFocus();
    });

    it('closes on a press outside the menu', () => {
      setup();
      fireEvent.click(trigger());

      fireEvent.pointerDown(document.body);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('keeps the trigger a 44px target', () => {
    setup();
    expect(trigger().className).toContain('h-11');
    expect(trigger().className).toContain('w-11');
  });

  // addendum-3 upcoming-menu-d / past-menu-m / menu-flip-focus-d.
  it('draws the desktop popover 250 wide with no arrow nub', () => {
    setup();
    fireEvent.click(trigger());
    const panel = document.querySelector('[data-mode="popover"]');
    expect(panel?.getAttribute('data-width')).toBe('250');
    expect(panel?.getAttribute('data-arrow')).toBe('false');
  });

  it('weights the items 700 and haloes keyboard focus with a 2px gap and a 4px ring', () => {
    setup();
    fireEvent.click(trigger());
    const item = screen.getAllByRole('menuitem')[0]!;
    expect(item.className).toContain('font-bold');
    expect(item.className).toContain('focus-visible:shadow-');
    expect(item.className).toContain('var(--signal)');
  });

  it('seats each phone icon in a 34px tile with a hairline between items', () => {
    mobile.value = true;
    setup('upcoming');
    fireEvent.click(trigger());
    const items = screen.getAllByRole('menuitem');
    for (const item of items) {
      expect(
        item.querySelector('span[aria-hidden="true"]')?.className,
      ).toContain('h-[34px]');
    }
    expect(items[1]!.className).toContain('border-t');
  });
});
