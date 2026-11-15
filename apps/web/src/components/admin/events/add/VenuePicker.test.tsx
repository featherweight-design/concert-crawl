// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { PickVenue } from './add-show-api';
import { VenuePicker } from './VenuePicker';

const COPY = ADMIN_COPY.addShow.venuePicker;
const MISSION = '0b9c4f3e-1d2a-4c5b-8e7f-a1b2c3d4e5f6';

const VENUES: PickVenue[] = [
  {
    id: MISSION,
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    active: true,
  },
  { id: 'v-hidden', name: 'Aardvark Hall', slug: 'aardvark', active: false },
  {
    id: 'v-bluebird',
    name: 'Bluebird Theater',
    slug: 'bluebird',
    active: true,
  },
];

const renderIt = (props: Partial<Parameters<typeof VenuePicker>[0]> = {}) => {
  const onChange = vi.fn();
  const onRetry = vi.fn();
  render(
    <VenuePicker
      id="venue"
      venues={VENUES}
      value=""
      onChange={onChange}
      onRetry={onRetry}
      phone={false}
      invalid={false}
      {...props}
    />,
  );
  return { onChange, onRetry };
};

const trigger = () => {
  const button = document.getElementById('venue');
  if (button === null) throw new Error('trigger');
  return button;
};

const names = () =>
  screen.getAllByRole('option').map((option) => option.textContent);

afterEach(cleanup);

describe('VenuePicker', () => {
  it('shows the placeholder until a venue is picked, then the venue', () => {
    renderIt();
    expect(trigger()).toHaveTextContent(ADMIN_COPY.addShow.venuePlaceholder);
    cleanup();
    renderIt({ value: MISSION });
    expect(trigger()).toHaveTextContent('Mission Ballroom');
  });

  it('lists hidden venues last and muted, the rest by name', () => {
    renderIt();
    fireEvent.click(trigger());
    expect(names()).toEqual([
      'Bluebird Theater',
      'Mission Ballroom',
      'Aardvark Hall',
    ]);
    const hidden = screen.getByRole('option', { name: /Aardvark Hall/ });
    expect(hidden).toHaveStyle({ opacity: '0.7' });
    expect(hidden.style.color).toBe('var(--fg-subtle)');
    const shown = screen.getByRole('option', { name: /Mission Ballroom/ });
    expect(shown).toHaveStyle({ opacity: '1' });
  });

  it('filters by the search, ignoring case', () => {
    renderIt();
    fireEvent.click(trigger());
    const search = screen.getByTestId('venue-search');
    expect(search).toHaveAttribute('placeholder', COPY.search(VENUES.length));
    fireEvent.change(search, { target: { value: 'BLUE' } });
    expect(names()).toEqual(['Bluebird Theater']);
  });

  it('says no venues match, with no way to add one', () => {
    renderIt();
    fireEvent.click(trigger());
    fireEvent.change(screen.getByTestId('venue-search'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByText(COPY.noMatch)).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).toBeNull();
    const popover = screen.getByTestId('venue-picker');
    // Only the search box: the picker never creates a venue.
    expect(within(popover).queryAllByRole('button')).toHaveLength(0);
  });

  it('picks a venue, marks it chosen, and closes', () => {
    const { onChange } = renderIt({ value: MISSION });
    fireEvent.click(trigger());
    expect(
      screen.getByRole('option', { name: /Mission Ballroom/ }),
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('option', { name: /Bluebird Theater/ }));
    expect(onChange).toHaveBeenCalledWith('v-bluebird');
    expect(screen.queryByTestId('venue-picker')).toBeNull();
  });

  it('works from the keyboard: focus in the search, native options, Escape back to the field', () => {
    renderIt();
    trigger().focus();
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('venue-search')).toHaveFocus();
    // Native buttons, so Tab reaches each and Enter or Space picks it.
    for (const option of screen.getAllByRole('option'))
      expect(option.tagName).toBe('BUTTON');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('venue-picker')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('shows the load-failed line with Try again, and opens no list', () => {
    const { onRetry } = renderIt({ venues: 'failed' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(COPY.loadFailed);
    fireEvent.click(within(alert).getByRole('button', { name: COPY.tryAgain }));
    expect(onRetry).toHaveBeenCalled();
    fireEvent.click(trigger());
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('draws nothing to pick while the venues load', () => {
    renderIt({ venues: null });
    fireEvent.click(trigger());
    expect(screen.queryByTestId('venue-search')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('carries the error state and its line', () => {
    renderIt({ invalid: true, describedBy: 'venue-error' });
    expect(trigger()).toHaveAttribute('aria-describedby', 'venue-error');
    expect(trigger().getAttribute('style')).toContain('var(--danger)');
  });

  it('opens a popover on desktop, not a sheet', () => {
    renderIt();
    fireEvent.click(trigger());
    expect(screen.getByTestId('venue-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-sheet')).toBeNull();
  });

  it('opens a sheet on the phone, and a pick closes it', () => {
    const { onChange } = renderIt({ phone: true });
    fireEvent.click(trigger());
    expect(screen.queryByTestId('venue-picker')).toBeNull();
    const sheet = screen.getByTestId('admin-sheet');
    expect(within(sheet).getByTestId('venue-search')).toBeInTheDocument();
    fireEvent.click(
      within(sheet).getByRole('option', { name: /Mission Ballroom/ }),
    );
    expect(onChange).toHaveBeenCalledWith(MISSION);
    expect(screen.queryByTestId('admin-sheet')).toBeNull();
  });
});
