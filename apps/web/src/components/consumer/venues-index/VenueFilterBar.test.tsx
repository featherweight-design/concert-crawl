// @vitest-environment jsdom

// /venues shares FilterPopover with Browse. The popover lost its "Any …"
// placeholder row for a header Clear (B+ B6a); this pins that the header Clear
// still clears a venues filter, and that the open chip's own press closes it.

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueFilterBar } from './VenueFilterBar';
import {
  VENUE_FILTER_DEFS,
  venueChipLabel,
  type VenueFilterState,
} from './venue-filter-defs';

const STATE: VenueFilterState = {
  sort: 'upcoming',
  capacity: 'club',
  distance: null,
};

const desktopChip = (label: string) => {
  // The mobile strip renders the same labels; the desktop row comes second.
  const chips = screen
    .getAllByRole('button')
    .filter((button) => button.textContent?.includes(label));
  const chip = chips.at(-1);
  if (!chip) throw new Error(`no chip for ${label}`);
  return chip;
};

// The mobile FilterSheet mounts alongside with the same name; the desktop
// popover is the one shown from sm up.
const desktopPopover = () => {
  const popover = screen
    .queryAllByRole('dialog', {
      name: `${VENUE_FILTER_DEFS.capacity.label} filter`,
    })
    .find((dialog) => dialog.classList.contains('sm:flex'));
  return popover ?? null;
};

describe('VenueFilterBar desktop popover', () => {
  it('the header Clear clears the open filter', () => {
    const onChange = vi.fn();
    render(<VenueFilterBar state={STATE} onChange={onChange} />);
    fireEvent.click(desktopChip(venueChipLabel('capacity', 'club')));
    const dialog = desktopPopover();
    if (!dialog) throw new Error('desktop popover did not open');
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: CONSUMER_COPY.filterBar.popover.clear,
      }),
    );
    expect(onChange).toHaveBeenCalledWith({ ...STATE, capacity: '' });
    expect(desktopPopover()).toBeNull();
  });

  it("the open chip's own press closes its popover", () => {
    render(<VenueFilterBar state={STATE} onChange={vi.fn()} />);
    const chip = desktopChip(venueChipLabel('capacity', 'club'));
    fireEvent.click(chip);
    expect(desktopPopover()).not.toBeNull();
    fireEvent.pointerDown(chip);
    fireEvent.click(chip);
    expect(desktopPopover()).toBeNull();
  });
});
