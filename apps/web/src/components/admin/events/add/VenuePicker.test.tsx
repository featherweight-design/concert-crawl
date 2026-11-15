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

  it('ties the open list to the field with aria-controls', () => {
    renderIt();
    expect(trigger()).not.toHaveAttribute('aria-controls');
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const controlled = trigger().getAttribute('aria-controls');
    expect(controlled).not.toBeNull();
    expect(document.getElementById(controlled ?? '')).toContainElement(
      screen.getByRole('listbox'),
    );
  });

  it('works as a listbox from the search: arrows, Home, End, Enter', () => {
    const { onChange } = renderIt();
    trigger().focus();
    fireEvent.click(trigger());
    const search = screen.getByRole('combobox');
    expect(search).toHaveFocus();
    const listbox = screen.getByRole('listbox');
    expect(search).toHaveAttribute('aria-controls', listbox.id);
    const activeName = () =>
      document.getElementById(
        search.getAttribute('aria-activedescendant') ?? '',
      )?.textContent;
    // With nothing chosen the first option is active.
    expect(activeName()).toBe('Bluebird Theater');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(activeName()).toBe('Mission Ballroom');
    fireEvent.keyDown(search, { key: 'End' });
    expect(activeName()).toBe('Aardvark Hall');
    // The ends hold rather than wrap.
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(activeName()).toBe('Aardvark Hall');
    fireEvent.keyDown(search, { key: 'Home' });
    expect(activeName()).toBe('Bluebird Theater');
    fireEvent.keyDown(search, { key: 'ArrowUp' });
    expect(activeName()).toBe('Bluebird Theater');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(MISSION);
    expect(screen.queryByTestId('venue-picker')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('opens on the chosen venue, and a search moves to its first match', () => {
    const { onChange } = renderIt({ value: 'v-hidden' });
    fireEvent.click(trigger());
    const search = screen.getByRole('combobox');
    expect(
      document.getElementById(
        search.getAttribute('aria-activedescendant') ?? '',
      ),
    ).toHaveTextContent('Aardvark Hall');
    fireEvent.change(search, { target: { value: 'mission' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(MISSION);
  });

  it('keeps a hidden venue pickable', () => {
    const { onChange } = renderIt();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('option', { name: /Aardvark Hall/ }));
    expect(onChange).toHaveBeenCalledWith('v-hidden');
  });

  it('closes on Escape and hands focus back to the field', () => {
    renderIt();
    trigger().focus();
    fireEvent.click(trigger());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('venue-picker')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('shows the load-failed line with Try again, and opens nothing', () => {
    const { onRetry } = renderIt({ venues: 'failed' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(COPY.loadFailed);
    fireEvent.click(within(alert).getByRole('button', { name: COPY.tryAgain }));
    expect(onRetry).toHaveBeenCalled();
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('venue-picker')).toBeNull();
    expect(screen.queryByTestId('admin-sheet')).toBeNull();
  });

  it('opens nothing while the venues load, on desktop or the phone', () => {
    renderIt({ venues: null });
    expect(trigger()).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('venue-picker')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();
    renderIt({ venues: null, phone: true });
    fireEvent.click(trigger());
    expect(screen.queryByTestId('admin-sheet')).toBeNull();
  });

  it('opens once the retried load lands', () => {
    const props = {
      id: 'venue',
      value: '',
      onChange: vi.fn(),
      onRetry: vi.fn(),
      phone: false,
      invalid: false,
    };
    const { rerender } = render(<VenuePicker {...props} venues="failed" />);
    // The parent's side of the contract: null on retry, then the array.
    rerender(<VenuePicker {...props} venues={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(<VenuePicker {...props} venues={VENUES} />);
    fireEvent.click(trigger());
    expect(screen.getAllByRole('option')).toHaveLength(VENUES.length);
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

describe('VenuePicker variants', () => {
  const tile = () => trigger().querySelector('svg[data-venue-tile]');

  it('keeps Add a show’s trigger: a 20px tile, 12px padding, no chevron', () => {
    renderIt({ value: MISSION });
    expect(tile()).toHaveAttribute('width', '20');
    expect(trigger().style.padding).toBe('0px 12px');
    expect(screen.queryByTestId('venue-picker-chevron')).toBeNull();
  });

  it('draws Event edit’s trigger: a 22px tile, the name, then a chevron', () => {
    renderIt({ value: MISSION, variant: 'edit' });
    expect(tile()).toHaveAttribute('width', '22');
    expect(trigger().style.padding).toBe('0px 10px');
    expect(trigger().style.height).toBe('38px');
    expect(trigger()).toHaveTextContent('Mission Ballroom');
    const chevron = screen.getByTestId('venue-picker-chevron');
    expect(chevron).toHaveAttribute('width', '13');
    // Trailing: the last thing in the field.
    expect(trigger().lastElementChild).toBe(chevron);
  });

  it('draws the chevron on the placeholder too', () => {
    renderIt({ variant: 'edit' });
    expect(trigger()).toHaveTextContent(ADMIN_COPY.addShow.venuePlaceholder);
    expect(screen.getByTestId('venue-picker-chevron')).toBeInTheDocument();
  });

  it('draws Event edit’s phone trigger as plain text: 12px padding, no tile or chevron', () => {
    renderIt({ value: MISSION, variant: 'edit', phone: true });
    expect(trigger()).toHaveTextContent('Mission Ballroom');
    expect(trigger().style.padding).toBe('0px 12px');
    expect(tile()).toBeNull();
    expect(screen.queryByTestId('venue-picker-chevron')).toBeNull();
  });

  it('keeps Add a show’s tile on the phone', () => {
    renderIt({ value: MISSION, phone: true });
    expect(tile()).toHaveAttribute('width', '20');
  });

  it('draws the list rows’ 24px tiles with a 1px edge and 6px corners', () => {
    renderIt();
    fireEvent.click(trigger());
    const option = screen.getByRole('option', { name: /Mission Ballroom/ });
    expect(option.querySelector('svg[data-venue-tile]')).toHaveAttribute(
      'width',
      '24',
    );
    // In the tile's 96 viewBox at 24px: 1px is 4 units, 6px is 24.
    const edge = option.querySelector('svg[data-venue-tile] rect');
    expect(edge).toHaveAttribute('stroke-width', '4');
    expect(edge).toHaveAttribute('rx', '24');
  });

  describe('the list’s length', () => {
    const MANY: PickVenue[] = [
      'Bluebird Theater',
      'Cervantes',
      'Fillmore',
      'Gothic Theatre',
      'Globe Hall',
      'Larimer Lounge',
      'Marquis',
      'Ogden Theatre',
    ].map((name, index) => ({
      id: `v-${index}`,
      name,
      slug: `slug-${index}`,
      active: true,
    }));

    it('shows 5 rows on Event edit, then how many a search finds', () => {
      renderIt({ venues: MANY, variant: 'edit' });
      fireEvent.click(trigger());
      expect(names()).toEqual([
        'Bluebird Theater',
        'Cervantes',
        'Fillmore',
        'Globe Hall',
        'Gothic Theatre',
      ]);
      expect(screen.getByTestId('venue-list-more')).toHaveTextContent(
        ADMIN_COPY.eventEdit.venue.typeToFind(3),
      );
      // A search looks through every venue, with no footer.
      fireEvent.change(screen.getByTestId('venue-search'), {
        target: { value: 'theat' },
      });
      expect(names()).toEqual([
        'Bluebird Theater',
        'Gothic Theatre',
        'Ogden Theatre',
      ]);
      expect(screen.queryByTestId('venue-list-more')).toBeNull();
    });

    it('keeps Add a show’s list whole, with no footer', () => {
      renderIt({ venues: MANY });
      fireEvent.click(trigger());
      expect(names()).toHaveLength(8);
      expect(screen.queryByTestId('venue-list-more')).toBeNull();
    });

    it('keeps Event edit’s phone sheet whole', () => {
      renderIt({ venues: MANY, variant: 'edit', phone: true });
      fireEvent.click(trigger());
      expect(names()).toHaveLength(8);
      expect(screen.queryByTestId('venue-list-more')).toBeNull();
    });

    it('draws no footer when 5 or fewer venues exist', () => {
      renderIt({ venues: MANY.slice(0, 5), variant: 'edit' });
      fireEvent.click(trigger());
      expect(names()).toHaveLength(5);
      expect(screen.queryByTestId('venue-list-more')).toBeNull();
    });
  });

  it('draws the known venue while the list loads', () => {
    renderIt({
      variant: 'edit',
      venues: null,
      value: 'v-larimer',
      known: { name: 'Larimer Lounge', slug: 'larimer-lounge' },
    });
    expect(trigger()).toHaveTextContent('Larimer Lounge');
    expect(trigger()).toHaveAttribute('aria-busy', 'true');
  });
});
