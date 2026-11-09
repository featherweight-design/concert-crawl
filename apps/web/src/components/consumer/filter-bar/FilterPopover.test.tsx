// @vitest-environment jsdom

import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterPopover, getPopoverPlacement } from './FilterPopover';

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

describe('FilterPopover', () => {
  const renderOpen = () => {
    const onClose = vi.fn();
    render(
      <div data-testid="chip-strip">
        <FilterPopover
          open
          title="Venue"
          placeholder="Any venue"
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
});
