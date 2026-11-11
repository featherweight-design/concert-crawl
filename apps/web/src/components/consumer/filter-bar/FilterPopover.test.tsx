// @vitest-environment jsdom

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
