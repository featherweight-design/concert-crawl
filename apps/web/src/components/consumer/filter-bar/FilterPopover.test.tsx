// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { render, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  FilterPopover,
  getPopoverLeft,
  getPopoverPlacement,
  getScrollIntoRoom,
} from './FilterPopover';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

describe('getPopoverPlacement', () => {
  it('opens below the chip with a capped height', () => {
    expect(getPopoverPlacement({ top: 380, bottom: 414 }, 900)).toEqual({
      top: 420,
      maxHeight: 464,
    });
  });

  it('never flips above the chip, even when the room below is short', () => {
    // The boards always drop the menu below the bar; opening scrolls for room.
    expect(getPopoverPlacement({ top: 760, bottom: 794 }, 900)).toEqual({
      top: 800,
      maxHeight: 84,
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

describe('getScrollIntoRoom', () => {
  it('does not scroll when the menu already fits below', () => {
    expect(getScrollIntoRoom({ top: 380, bottom: 414 }, 900, 300)).toBe(0);
  });

  it('scrolls just enough for the menu to fit below', () => {
    // 900 - 794 - 6 - 16 = 84 below; a 300px menu needs 216 more.
    expect(getScrollIntoRoom({ top: 760, bottom: 794 }, 900, 300)).toBe(216);
  });

  it('makes at least the minimum room for a short menu', () => {
    expect(getScrollIntoRoom({ top: 760, bottom: 794 }, 900, 100)).toBe(156);
  });

  it('caps the room it makes for a tall menu', () => {
    expect(getScrollIntoRoom({ top: 760, bottom: 794 }, 900, 2000)).toBe(436);
  });

  it('never tucks the chip under the sticky site header', () => {
    // The chip may rise to 64 + 16 = 80 from the top, so 40px at most.
    expect(getScrollIntoRoom({ top: 120, bottom: 154 }, 300, 400)).toBe(40);
    expect(getScrollIntoRoom({ top: 70, bottom: 104 }, 300, 400)).toBe(0);
  });
});

describe('FilterPopover opened low in the viewport', () => {
  let scrollYDescriptor: PropertyDescriptor | undefined;
  let innerHeight: number;

  beforeEach(() => {
    scrollYDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY');
    innerHeight = window.innerHeight;
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    });
    window.innerHeight = 900;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.innerHeight = innerHeight;
    if (scrollYDescriptor) {
      Object.defineProperty(window, 'scrollY', scrollYDescriptor);
    }
  });

  const mockScroll = (limit: number) =>
    vi
      .spyOn(window, 'scrollBy')
      .mockImplementation((options?: ScrollToOptions | number) => {
        const by = typeof options === 'number' ? options : (options?.top ?? 0);
        window.scrollY = Math.min(window.scrollY + by, limit);
      });

  const renderLow = () => {
    const onClose = vi.fn();
    render(
      <FilterPopover
        open
        title="Where"
        options={[{ value: 'ogden', label: 'Ogden Theatre' }]}
        value=""
        anchorRect={new DOMRect(0, 760, 120, 34)}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    return onClose;
  };

  it('scrolls the bar up instantly and opens below it', () => {
    const scrollBy = mockScroll(10_000);
    renderLow();
    // jsdom measures no content, so it makes the 240px minimum: 156 more.
    expect(scrollBy).toHaveBeenCalledWith({ top: 156, behavior: 'instant' });
    const popover = screen.getByTestId('filter-popover');
    expect(popover.style.top).toBe('644px');
    expect(popover.style.maxHeight).toBe('240px');
    expect(popover.style.bottom).toBe('');
  });

  it('is not closed by its own scroll, but is by the next one', () => {
    mockScroll(10_000);
    const onClose = renderLow();
    fireEvent.scroll(window);
    expect(onClose).not.toHaveBeenCalled();

    window.scrollY = 300;
    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('caps its height to the room a short page could make, still below', () => {
    mockScroll(50);
    renderLow();
    const popover = screen.getByTestId('filter-popover');
    expect(popover.style.top).toBe('750px');
    expect(popover.style.maxHeight).toBe('134px');
  });

  const popoverAt = (anchorRect: DOMRect, onClose: () => void, open = true) => (
    <FilterPopover
      open={open}
      title="Where"
      options={[{ value: 'ogden', label: 'Ogden Theatre' }]}
      value=""
      anchorRect={anchorRect}
      onSelect={vi.fn()}
      onClose={onClose}
    />
  );

  it('keeps the guard when it re-runs before its scroll event arrives', () => {
    mockScroll(10_000);
    const onClose = vi.fn();
    const { rerender } = render(
      popoverAt(new DOMRect(0, 760, 120, 34), onClose),
    );
    // Another chip opens in place, with room enough: no second scroll.
    rerender(popoverAt(new DOMRect(0, 100, 120, 34), onClose));
    fireEvent.scroll(window);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not reuse the last offset when reopened on the same rect', () => {
    // The page can scroll 156 once, and no further.
    mockScroll(156);
    const onClose = vi.fn();
    const rect = new DOMRect(0, 760, 120, 34);
    const { rerender } = render(popoverAt(rect, onClose));
    expect(screen.getByTestId('filter-popover').style.top).toBe('644px');

    rerender(popoverAt(rect, onClose, false));
    rerender(popoverAt(rect, onClose));
    // The rect is the same object, but this open scrolled nothing.
    expect(screen.getByTestId('filter-popover').style.top).toBe('800px');
  });

  it('counts its own scroll within a pixel of where it landed', () => {
    vi.spyOn(window, 'scrollBy').mockImplementation(
      (options?: ScrollToOptions | number) => {
        const by = typeof options === 'number' ? options : (options?.top ?? 0);
        window.scrollY += by + 0.4;
      },
    );
    const onClose = renderLow();
    // The browser reports the rounded position when the event arrives.
    window.scrollY = 156;
    fireEvent.scroll(window);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('consumes the guard, so a later scroll to the same offset closes', () => {
    mockScroll(10_000);
    const onClose = renderLow();
    fireEvent.scroll(window);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when the popover is hidden below `sm`', () => {
    const scrollBy = mockScroll(10_000);
    const realGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element: Element, pseudo?: string | null) => {
        const style = realGetComputedStyle(element, pseudo);
        if (element.getAttribute('data-testid') !== 'filter-popover') {
          return style;
        }
        return Object.create(style, { display: { value: 'none' } });
      },
    );
    renderLow();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(screen.getByTestId('filter-popover').style.top).toBe('800px');
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
    const scrollBy = vi.spyOn(window, 'scrollBy');
    const onClose = renderOpen();
    // Room enough below the chip, so opening scrolled nothing.
    expect(scrollBy).not.toHaveBeenCalled();
    scrollBy.mockRestore();
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
