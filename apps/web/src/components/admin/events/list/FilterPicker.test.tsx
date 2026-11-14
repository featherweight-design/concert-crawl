// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { FilterPicker, type PickerOption } from './FilterPicker';

const STATUSES: PickerOption[] = [
  { key: 'postponed', label: 'Postponed', count: 6 },
  { key: 'cancelled', label: 'Cancelled', count: 9 },
];

// `useIsPhone` reads matchMedia, which jsdom does not ship.
const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const picker = (props: Partial<Parameters<typeof FilterPicker>[0]> = {}) => (
  <FilterPicker
    label="Any status"
    testId="status-filter"
    options={STATUSES}
    selected={[]}
    unticked={15}
    onApply={vi.fn()}
    {...props}
  />
);

beforeEach(() => setPhone(false));
afterEach(cleanup);

describe('FilterPicker', () => {
  it('opens as a sheet on the phone and applies with Show N', () => {
    setPhone(true);
    const onApply = vi.fn();
    render(picker({ onApply }));
    fireEvent.click(screen.getByTestId('status-filter-chip'));
    const sheet = screen.getByTestId('admin-sheet');
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(within(sheet).getByLabelText(/Cancelled/));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Show 9' }));
    expect(onApply).toHaveBeenCalledWith(['cancelled']);
    expect(screen.queryByTestId('admin-sheet')).toBeNull();
  });

  it('drops the ticks when it closes without Show', () => {
    const onApply = vi.fn();
    render(picker({ onApply }));
    const chip = screen.getByTestId('status-filter-chip');
    fireEvent.click(chip);
    fireEvent.click(screen.getByLabelText(/Postponed/));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('status-filter')).toBeNull();
    fireEvent.click(chip);
    expect(screen.getByLabelText(/Postponed/)).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('closes on Escape and hands focus back to its chip', () => {
    render(picker());
    const chip = screen.getByTestId('status-filter-chip');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('status-filter')).toBeNull();
    expect(chip).toHaveFocus();
  });

  it('is pressed while a selection applies, and follows a selection that moves while open', () => {
    const { rerender } = render(picker({ selected: ['postponed'] }));
    const chip = screen.getByTestId('status-filter-chip');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(screen.getByLabelText(/Postponed/)).toBeChecked();
    rerender(picker({ selected: [] }));
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText(/Postponed/)).not.toBeChecked();
  });

  it('disables the unticked rows at the cap', () => {
    // Labels end in "-x" so the count after them can't blur one into another.
    const venues = Array.from({ length: 51 }, (_, i) => ({
      key: `venue-${i}`,
      label: `Hall-${i}-x`,
      count: 1,
    }));
    render(
      picker({
        options: venues,
        selected: venues.slice(0, 50).map((venue) => venue.key),
        max: 50,
      }),
    );
    fireEvent.click(screen.getByTestId('status-filter-chip'));
    const last = screen.getByLabelText(/Hall-50-x/);
    expect(last).toBeDisabled();
    const first = screen.getByLabelText(/Hall-0-x/);
    expect(first).toBeEnabled();
    fireEvent.click(first);
    expect(last).toBeEnabled();
  });
});
