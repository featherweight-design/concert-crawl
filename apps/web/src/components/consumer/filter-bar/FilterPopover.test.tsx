// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  FilterPopover,
  getPopoverLeft,
  getPopoverPlacement,
} from './FilterPopover';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

describe('getPopoverPlacement', () => {
  it('opens below the chip with a capped height', () => {
    expect(getPopoverPlacement({ top: 380, bottom: 414 }, 900)).toEqual({
      top: 420,
      maxHeight: 464,
    });
  });

  it('flips above the chip when the room below is short', () => {
    expect(getPopoverPlacement({ top: 760, bottom: 794 }, 900)).toEqual({
      bottom: 146,
      maxHeight: 738,
    });
  });

  it('stays below when the room below meets the minimum', () => {
    expect(getPopoverPlacement({ top: 100, bottom: 134 }, 400)).toEqual({
      top: 140,
      maxHeight: 244,
    });
  });

  it('stays below when the room is tight both ways', () => {
    expect(getPopoverPlacement({ top: 100, bottom: 134 }, 300)).toEqual({
      top: 140,
      maxHeight: 144,
    });
  });

  it('never returns a negative height', () => {
    expect(getPopoverPlacement({ top: 10, bottom: 44 }, 60)).toEqual({
      top: 50,
      maxHeight: 0,
    });
  });
});

describe('getPopoverLeft', () => {
  it('sits under its anchor when it fits', () => {
    expect(getPopoverLeft(200, 260, 1280)).toBe(200);
  });

  it('pulls a wide popover back inside the right margin', () => {
    expect(getPopoverLeft(900, 620, 1280)).toBe(644);
  });

  it('never starts left of the margin', () => {
    expect(getPopoverLeft(0, 620, 1280)).toBe(16);
  });

  it("right-aligns to the bar's edge rather than running past it", () => {
    // bp-f-filt_where_d: Where opens at 616, the bar ends at 1160.
    expect(getPopoverLeft(616, 620, 1280, 1160)).toBe(540);
    // vibe_pop_d: Vibe opens at 976, the same edge.
    expect(getPopoverLeft(976, 560, 1280, 1160)).toBe(600);
  });

  it('stays under its anchor when it already ends inside the bar', () => {
    expect(getPopoverLeft(300, 260, 1280, 1160)).toBe(300);
  });

  it('still keeps the viewport margin when the bound is further out', () => {
    expect(getPopoverLeft(900, 620, 1280, 1300)).toBe(644);
  });
});

describe('FilterPopover body and footer', () => {
  const renderWith = (props: {
    inset?: 'list' | 'wide';
    footer?: React.ReactNode;
  }) =>
    render(
      <FilterPopover
        open
        title="Vibe"
        options={[{ value: 'indie', label: 'Indie' }]}
        value=""
        anchorRect={new DOMRect(0, 100, 120, 34)}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />,
    );

  it('pins the footer outside the scrolling body', () => {
    renderWith({ inset: 'wide', footer: <button type="button">Go</button> });
    const body = screen.getByTestId('filter-popover-body');
    const footer = screen.getByTestId('filter-popover-footer');
    expect(body.contains(footer)).toBe(false);
    expect(footer).toHaveClass('justify-end', 'px-4');
  });

  it('draws no footer when none is given', () => {
    renderWith({});
    expect(screen.queryByTestId('filter-popover-footer')).toBeNull();
  });

  it('a wide body sits on the 16px inset with a 16px foot outside the scroll', () => {
    renderWith({ inset: 'wide' });
    expect(screen.getByTestId('filter-popover')).toHaveClass('pb-4');
    expect(screen.getByTestId('filter-popover-body')).toHaveClass('px-4');
  });

  it('a plain list keeps its own row padding', () => {
    renderWith({});
    expect(screen.getByTestId('filter-popover')).toHaveClass('pb-2');
    expect(screen.getByTestId('filter-popover-body')).toHaveClass('px-2');
  });

  it("sits on the board's raised surface", () => {
    renderWith({});
    expect(screen.getByTestId('filter-popover').className).toContain(
      '[--sheet-bg:var(--surface-2)]',
    );
  });
});

describe('FilterPopover', () => {
  const renderOpen = () => {
    const onClose = vi.fn();
    render(
      <div data-testid="chip-strip">
        <FilterPopover
          open
          title="Venue"
          options={[{ value: 'ogden', label: 'Ogden Theatre' }]}
          value=""
          anchorRect={new DOMRect(0, 100, 120, 34)}
          onSelect={vi.fn()}
          onClose={onClose}
        />
      </div>,
    );
    return onClose;
  };

  it('closes when the window scrolls', () => {
    const onClose = renderOpen();
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when a container around the chip scrolls', () => {
    const onClose = renderOpen();
    fireEvent.scroll(screen.getByTestId('chip-strip'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open while its own list scrolls', () => {
    const onClose = renderOpen();
    fireEvent.scroll(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a width resize but not a height-only one', () => {
    const onClose = renderOpen();
    const { innerWidth, innerHeight } = window;
    try {
      window.innerHeight = innerHeight - 200;
      fireEvent(window, new Event('resize'));
      expect(onClose).not.toHaveBeenCalled();

      window.innerWidth = innerWidth - 100;
      fireEvent(window, new Event('resize'));
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      window.innerWidth = innerWidth;
      window.innerHeight = innerHeight;
    }
  });

  it('heads the list with its title, sub and a Clear that resets', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <FilterPopover
        open
        title="Price"
        sub="One line"
        options={[{ value: 'under-25', label: 'Under $25' }]}
        value="under-25"
        anchorRect={new DOMRect(0, 100, 120, 34)}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('One line')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Under $25' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(
      screen.getByRole('button', {
        name: CONSUMER_COPY.filterBar.popover.clear,
      }),
    );
    expect(onSelect).toHaveBeenCalledWith('');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = renderOpen();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
