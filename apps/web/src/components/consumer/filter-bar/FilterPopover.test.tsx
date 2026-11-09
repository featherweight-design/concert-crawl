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

  it('stays below when the room is tight both ways', () => {
    expect(getPopoverPlacement({ top: 100, bottom: 134 }, 400)).toEqual({
      top: 140,
      maxHeight: 244,
    });
  });
});

describe('FilterPopover', () => {
  it('closes when the window scrolls', () => {
    const onClose = vi.fn();
    render(
      <FilterPopover
        open
        title="Venue"
        placeholder="Any venue"
        options={[{ value: 'ogden', label: 'Ogden Theatre' }]}
        value=""
        anchorRect={new DOMRect(0, 100, 120, 34)}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.scroll(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.scroll(window);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
