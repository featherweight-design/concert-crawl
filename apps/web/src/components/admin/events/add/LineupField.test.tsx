// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { ArtistSuggestion } from './add-show-api';
import type { Act } from './add-show-rules';
import { LineupField } from './LineupField';

const COPY = ADMIN_COPY.addShow.lineupField;
/** LineupField's SEARCH_DEBOUNCE_MS. */
const DEBOUNCE_MS = 250;

const search = vi.fn(
  async (_text: string, _signal: AbortSignal): Promise<ArtistSuggestion[]> => [
    { id: 'a1', name: 'Kaleo' },
  ],
);
const changes = vi.fn();

/** The field over real state, so each change redraws the bill. */
const Harness = ({
  phone = false,
  initial = [],
}: {
  phone?: boolean;
  initial?: Act[];
}) => {
  const [lineup, setLineup] = useState<Act[]>(initial);
  return (
    <LineupField
      id="lineup"
      lineup={lineup}
      onChange={(next) => {
        changes(next);
        setLineup(next);
      }}
      search={search}
      phone={phone}
      invalid={false}
    />
  );
};

const input = () => screen.getByRole('combobox');
const chips = () => screen.getAllByTestId('lineup-chip');
const type = (text: string) =>
  fireEvent.change(input(), { target: { value: text } });
const enter = (name: string) => {
  type(name);
  fireEvent.keyDown(input(), { key: 'Enter' });
};
/** Runs the debounce and lets the search's promise settle. */
const settle = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  search.mockClear();
  changes.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LineupField', () => {
  it('adds a typed name on Enter and clears the box', () => {
    render(<Harness />);
    enter('  Kaleo  ');
    expect(changes).toHaveBeenLastCalledWith([{ name: 'Kaleo' }]);
    expect(chips()).toHaveLength(1);
    expect(input()).toHaveValue('');
  });

  it('suggests artists after the debounce, and a pick links the artist', async () => {
    render(<Harness />);
    type('kal');
    expect(search).not.toHaveBeenCalled();
    await settle();
    expect(search).toHaveBeenCalledWith('kal', expect.any(AbortSignal));
    expect(
      screen.getByRole('listbox', { name: COPY.suggestions }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: COPY.addTyped('kal') }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Kaleo' }));
    expect(changes).toHaveBeenLastCalledWith([
      { name: 'Kaleo', artistId: 'a1' },
    ]);
  });

  it('picks a suggestion from the keyboard', async () => {
    render(<Harness />);
    type('kal');
    await settle();
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Kaleo' }).id,
    );
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(changes).toHaveBeenLastCalledWith([
      { name: 'Kaleo', artistId: 'a1' },
    ]);
  });

  it('asks nothing and lists nothing for a blank query', async () => {
    render(<Harness />);
    type('   ');
    await settle();
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(changes).not.toHaveBeenCalled();
  });

  it('keeps the typed option when the search fails', async () => {
    search.mockRejectedValueOnce(new Error('offline'));
    render(<Harness />);
    type('kal');
    await settle();
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(
      screen.getByRole('option', { name: COPY.addTyped('kal') }),
    ).toBeInTheDocument();
  });

  it('marks the first act the headliner and the rest support', () => {
    render(<Harness />);
    enter('Kaleo');
    enter('The Band of Heathens');
    expect(chips()[0]).toHaveAccessibleName(
      COPY.chipLabel('Kaleo', COPY.headliner),
    );
    expect(chips()[1]).toHaveAccessibleName(
      COPY.chipLabel('The Band of Heathens', COPY.support),
    );
  });

  it('removes an act, and the next becomes the headliner', () => {
    render(<Harness />);
    enter('Kaleo');
    enter('The Band of Heathens');
    fireEvent.click(screen.getByRole('button', { name: COPY.remove('Kaleo') }));
    expect(chips()).toHaveLength(1);
    expect(chips()[0]).toHaveAccessibleName(
      COPY.chipLabel('The Band of Heathens', COPY.headliner),
    );
  });

  it('drops a name already on the bill, as the API would (`addAct`)', () => {
    render(<Harness />);
    enter('Kaleo');
    // `canonicalizeArtist` folds case and keeps the billing's first act.
    enter('KALEO w/ Friends');
    enter('kaleo');
    expect(chips()).toHaveLength(1);
    expect(chips()[0]).toHaveAccessibleName(
      COPY.chipLabel('Kaleo', COPY.headliner),
    );
  });

  it('reorders by drag on desktop', () => {
    render(<Harness />);
    enter('One');
    enter('Two');
    const [first, second] = chips();
    if (!first || !second) throw new Error('chips');
    expect(first).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(second);
    fireEvent.drop(first);
    expect(chips()[0]).toHaveAccessibleName(
      COPY.chipLabel('Two', COPY.headliner),
    );
  });

  it('reorders with Alt+arrow from the keyboard, and stops at the ends', () => {
    render(
      <Harness
        initial={[{ name: 'One' }, { name: 'Two' }, { name: 'Three' }]}
      />,
    );
    const two = screen.getByRole('group', {
      name: COPY.chipLabel('Two', COPY.support),
    });
    fireEvent.keyDown(two, { key: 'ArrowLeft', altKey: true });
    expect(changes).toHaveBeenLastCalledWith([
      { name: 'Two' },
      { name: 'One' },
      { name: 'Three' },
    ]);
    // Already the headliner: no change.
    changes.mockClear();
    fireEvent.keyDown(
      screen.getByRole('group', {
        name: COPY.chipLabel('Two', COPY.headliner),
      }),
      { key: 'ArrowLeft', altKey: true },
    );
    expect(changes).not.toHaveBeenCalled();
    // Without Alt the arrow does nothing.
    fireEvent.keyDown(
      screen.getByRole('group', { name: COPY.chipLabel('One', COPY.support) }),
      { key: 'ArrowRight' },
    );
    expect(changes).not.toHaveBeenCalled();
    fireEvent.keyDown(
      screen.getByRole('group', { name: COPY.chipLabel('One', COPY.support) }),
      { key: 'ArrowRight', altKey: true },
    );
    expect(changes).toHaveBeenLastCalledWith([
      { name: 'Two' },
      { name: 'Three' },
      { name: 'One' },
    ]);
  });

  it('moves an act up with an arrow on the phone, with no drag', () => {
    render(<Harness phone initial={[{ name: 'One' }, { name: 'Two' }]} />);
    expect(chips()[0]).not.toHaveAttribute('draggable', 'true');
    // The headliner has nowhere to go: no arrow.
    expect(
      screen.queryByRole('button', { name: COPY.moveEarlier('One') }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.moveEarlier('Two') }),
    );
    expect(chips()[0]).toHaveAccessibleName(
      COPY.chipLabel('Two', COPY.headliner),
    );
    expect(screen.getByText(COPY.hintPhone)).toBeInTheDocument();
  });

  it('clears the search on Escape', () => {
    render(<Harness />);
    type('kal');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input()).toHaveValue('');
  });
});
