// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { stubMatchMedia } from '@/test-utils/match-media';
import type { CrewSummary } from '@concert-crawl/types';
import { CrewLensRail, CrewPickerBody } from './CrewLens';

const crew = (id: string, name: string): CrewSummary => ({
  id,
  name,
  patchSalt: 0,
  memberCount: 3,
  members: [],
  upcomingCount: 2,
  isKeeper: false,
  muted: false,
});

const CREWS = [crew('c1', 'Thursdays'), crew('c2', 'Night Shift')];

beforeEach(() => stubMatchMedia(true));
afterEach(cleanup);

// The picker body behind the desktop bar's Who segment. (The heading pill that
// used to open it is gone: B+ B6b moved the lens into the filter bar.)
describe('CrewPickerBody', () => {
  const renderPicker = (
    selectedId: string | null,
    onSelect: (crewId: string | null) => void = vi.fn(),
  ) =>
    render(
      <CrewPickerBody
        crews={CREWS}
        selectedId={selectedId}
        compact
        onSelect={onSelect}
      />,
    );

  it('offers a reset row above the crews and reports a pick', () => {
    const onSelect = vi.fn();
    renderPicker(null, onSelect);
    expect(screen.getByText('Everyone')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Night Shift'));
    expect(onSelect).toHaveBeenCalledWith('c2');
    fireEvent.click(screen.getByText('Everyone'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('offers the crews as one single-select set, not loose toggles', () => {
    renderPicker('c1');

    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();
    // Everyone + the two crews, with only the active one checked.
    const options = screen.getAllByRole('radio');
    expect(options).toHaveLength(3);
    expect(
      options.filter((opt) => opt.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /Thursdays/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('keeps the group to one tab stop and moves focus with the arrows', () => {
    renderPicker('c1');

    const options = screen.getAllByRole('radio');
    expect(options.filter((opt) => opt.tabIndex === 0)).toHaveLength(1);

    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(screen.getByRole('radio', { name: /Night Shift/ })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'Home' });
    expect(screen.getByRole('radio', { name: /Everyone/ })).toHaveFocus();
  });
});

describe('CrewLensRail', () => {
  it('states the narrowed count and clears back to everyone', () => {
    const onClear = vi.fn();
    render(<CrewLensRail count={3} onClear={onClear} />);
    expect(screen.getByText(/CREW LENS · 3 SHOWS/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Crew lens off/ }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('declines to claim zero shows when the feed failed', () => {
    render(<CrewLensRail count={null} onClear={vi.fn()} />);
    expect(screen.getByText(/CREW LENS · NO RESULT/)).toBeInTheDocument();
    expect(screen.queryByText(/0 SHOWS/)).not.toBeInTheDocument();
  });
});
