// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

import { ApiError } from '@/lib/api';

const HIDE = ADMIN_COPY.eventEdit.hide;
const DELETE = ADMIN_COPY.eventDelete;
import type { EventListRow } from './events-api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// The panel has its own tests; here only that the row opens it on this row.
vi.mock('../merge/MergePanel', () => ({
  MergePanel: ({
    current,
    onMerged,
  }: {
    current: { id: string };
    onMerged: (keptId: string) => void;
  }) => (
    <button
      type="button"
      data-testid="merge-panel"
      data-current={current.id}
      onClick={() => onMerged(current.id)}
    />
  ),
}));

import { EVENTS_HEADING_ID, EventsList } from './EventsList';

const COPY = ADMIN_COPY.eventsList;

const row = (overrides: Partial<EventListRow>): EventListRow => ({
  id: 'evt-1',
  title: 'Clipse & J.I.D',
  date: '2026-11-12',
  venueName: 'Red Rocks',
  venueSlug: 'red-rocks',
  venueUrl: null,
  status: 'available',
  hidden: false,
  manual: false,
  hiddenReason: null,
  priceMin: '65.00',
  priceMax: '495.00',
  watchingCount: 31,
  wentCount: null,
  ...overrides,
});

// `useIsPhone` reads matchMedia, which jsdom does not ship.
const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  setPhone(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EventsList on desktop', () => {
  it('keeps a hidden show’s status chip and tags Hidden under the title (4b#8)', () => {
    render(
      <EventsList
        when="upcoming"
        rows={[
          row({
            id: 'evt-2',
            title: 'Michael Smoak',
            status: 'soldout',
            hidden: true,
            hiddenReason: 'unsure',
            watchingCount: 7,
          }),
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: COPY.title });
    const [, dataRow] = within(table).getAllByRole('row');
    expect(dataRow).toBeDefined();
    const cells = within(dataRow as HTMLElement);
    expect(cells.getByText(COPY.status.soldout)).toBeInTheDocument();
    // Hidden is not a status (addendum 5, §2): the tag sits in the Show cell.
    const tag = cells.getByTestId('hidden-tag');
    expect(tag).toHaveTextContent(COPY.hiddenTag.unsure);
    expect(tag.closest('td')).toHaveTextContent('Michael Smoak');
    expect(tag.closest('td')).not.toHaveTextContent(COPY.status.soldout);
    // Watching reads "—" on a hidden row.
    expect(cells.queryByText('7')).not.toBeInTheDocument();
    expect(cells.getByText(COPY.none)).toBeInTheDocument();
  });

  it('names an admin-hidden show’s reason', () => {
    render(
      <EventsList
        when="upcoming"
        rows={[row({ hidden: true, hiddenReason: 'admin' })]}
      />,
    );
    expect(screen.getByText(COPY.status.available)).toBeInTheDocument();
    expect(screen.getByText(COPY.hiddenTag.admin)).toBeInTheDocument();
  });

  it('draws price, Watching and the ⋯ on an upcoming row', () => {
    render(<EventsList when="upcoming" rows={[row({})]} />);
    expect(screen.getByText('$65–$495')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.queryByTestId('hidden-tag')).toBeNull();
    expect(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    ).toBeInTheDocument();
  });

  it('draws Played, CONCERTS "went" and no ⋯ on Past', () => {
    render(
      <EventsList
        when="past"
        rows={[
          row({
            title: 'Japanese Breakfast',
            status: 'played',
            priceMin: '45.00',
            priceMax: null,
            wentCount: 14,
          }),
          row({
            id: 'evt-3',
            title: 'Turnstile',
            status: 'cancelled',
            priceMin: null,
            priceMax: null,
            wentCount: 0,
          }),
        ]}
      />,
    );
    expect(
      screen.getByRole('columnheader', { name: COPY.columns.concerts }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.status.played)).toBeInTheDocument();
    expect(screen.getByText(COPY.went(14))).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the past-show editor from the whole past row, a real link with the chevron drawn for hover (36/past-d)', () => {
    render(
      <EventsList
        when="past"
        rows={[
          row({ title: 'Japanese Breakfast', status: 'played', wentCount: 14 }),
        ]}
      />,
    );
    // Named with the date too, so same-title shows differ.
    const link = screen.getByRole('link', {
      name: `Japanese Breakfast${COPY.rowDate('Thu Nov 12')}`,
    });
    expect(link).toHaveAttribute('href', '/admin/events/evt-1/edit');
    expect(link.className).toContain('after:inset-0');
    const dataRow = screen.getByTestId('event-row');
    expect(dataRow.className).toContain('group');
    // WebKit won't position a <tr>: every cell is the containing block, and
    // each cell but the title's carries a cover to the same editor, out of
    // the tab order and hidden from assistive tech.
    const cells = within(dataRow).getAllByRole('cell');
    for (const cell of cells)
      expect(cell).toHaveStyle({ position: 'relative' });
    const covers = within(dataRow).getAllByTestId('row-cover');
    expect(covers).toHaveLength(cells.length - 1);
    for (const cover of covers) {
      expect(cover).toHaveAttribute('href', '/admin/events/evt-1/edit');
      expect(cover).toHaveAttribute('tabindex', '-1');
      expect(cover).toHaveAttribute('aria-hidden', 'true');
    }
    // The chevron waits for hover or focus, and is never read out.
    const chevron = within(dataRow).getByTestId('row-chevron');
    expect(chevron.getAttribute('class')).toContain('group-hover:opacity-100');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    // Keyboard: in the tab order, and nothing else in the row to press.
    link.focus();
    expect(link).toHaveFocus();
    expect(within(dataRow).getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps an upcoming row unlinked, with its ⋯ and no chevron', () => {
    render(<EventsList when="upcoming" rows={[row({})]} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByTestId('row-chevron')).toBeNull();
  });

  it('says No new date yet under a postponed past show only (36/past-d)', () => {
    render(
      <EventsList
        when="past"
        rows={[
          row({ id: 'evt-6', title: 'Ninth Key', status: 'postponed' }),
          row({ id: 'evt-7', title: 'Turnstile', status: 'cancelled' }),
        ]}
      />,
    );
    const lines = screen.getAllByTestId('no-new-date');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent(ADMIN_COPY.eventEdit.postponed.noDate);
    expect(lines[0]?.style.fontSize).toBe('11.5px');
    cleanup();

    render(
      <EventsList when="upcoming" rows={[row({ status: 'postponed' })]} />,
    );
    expect(screen.queryByTestId('no-new-date')).toBeNull();
  });

  it('offers View on the venue’s site only when the row has a venue page', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(
      <EventsList
        when="upcoming"
        rows={[
          row({ venueUrl: 'https://redrocks.example/shows/1' }),
          row({ id: 'evt-2', title: 'Unsafe', venueUrl: null }),
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(COPY.menu.viewVenue) }),
    );
    expect(open).toHaveBeenCalledWith(
      'https://redrocks.example/shows/1',
      '_blank',
      'noopener',
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Unsafe') }),
    );
    expect(
      screen.queryByRole('menuitem', { name: new RegExp(COPY.menu.viewVenue) }),
    ).toBeNull();
  });

  it('opens the merge panel on the row from the ⋯, and reloads when it merges', () => {
    const onMerged = vi.fn();
    render(
      <EventsList
        when="upcoming"
        rows={[row({ id: 'evt-9' })]}
        onMerged={onMerged}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', {
        name: new RegExp(ADMIN_COPY.eventEdit.menu.merge),
      }),
    );
    const panel = screen.getByTestId('merge-panel');
    expect(panel).toHaveAttribute('data-current', 'evt-9');
    fireEvent.click(panel);
    expect(onMerged).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('merge-panel')).toBeNull();
  });

  it('hides from the ⋯ through the Hide dialog, and offers it only on a shown show', async () => {
    const onHide = vi.fn(async () => undefined);
    render(
      <EventsList
        when="upcoming"
        rows={[row({ id: 'evt-2', title: 'Gone', hidden: true })]}
        onHide={onHide}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Gone') }),
    );
    expect(
      screen.queryByRole('menuitem', { name: new RegExp(HIDE.menu) }),
    ).toBeNull();
    cleanup();

    render(<EventsList when="upcoming" rows={[row({})]} onHide={onHide} />);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(HIDE.menu) }),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(HIDE.title('Clipse & J.I.D'));
    fireEvent.click(
      within(dialog).getByRole('button', { name: new RegExp(HIDE.confirm) }),
    );
    await waitFor(() =>
      expect(onHide).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'evt-1' }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // Back on the ⋯: the menu item it opened from is gone.
    expect(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    ).toHaveFocus();
  });

  it('keeps the Hide dialog open and says so when the save fails', async () => {
    const onHide = vi.fn(async () => {
      throw new Error('500');
    });
    render(<EventsList when="upcoming" rows={[row({})]} onHide={onHide} />);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(HIDE.menu) }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: new RegExp(HIDE.confirm),
      }),
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers Delete… on a manual row only', () => {
    const onDelete = vi.fn(async () => undefined);
    render(
      <EventsList
        when="upcoming"
        rows={[row({}), row({ id: 'evt-2', title: 'By hand', manual: true })]}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    );
    expect(
      screen.queryByRole('menuitem', { name: new RegExp(DELETE.menu) }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('By hand') }),
    );
    expect(
      screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
    ).toBeInTheDocument();
  });

  it('deletes through the dialog once the title is typed, and goes back to the ⋯', async () => {
    const onDelete = vi.fn(async () => undefined);
    render(
      <EventsList
        when="upcoming"
        rows={[row({ title: 'By hand', manual: true })]}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('By hand') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(DELETE.title('By hand'));
    const confirm = within(dialog).getByRole('button', {
      name: new RegExp(DELETE.confirm),
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(DELETE.field), {
      target: { value: 'by hand' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'evt-1' }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', { name: COPY.menu.label('By hand') }),
    ).toHaveFocus();
  });

  it.each([
    [new ApiError(409, 'not_manual'), DELETE.notManual],
    [
      new ApiError(
        409,
        'has_dependents',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          success: false,
          error: 'has_dependents',
          counts: {
            watchers: 1,
            concerts: 2,
            submittedPrices: 0,
            redirects: 1,
          },
        },
      ),
      'Can’t delete: it has 1 Watcher, 2 Concerts and 1 merged listing pointing here.',
    ],
  ])(
    'says why a refused delete was refused and holds the confirm',
    async (err, line) => {
      const onDelete = vi.fn(async () => {
        throw err;
      });
      render(
        <EventsList
          when="upcoming"
          rows={[row({ title: 'By hand', manual: true })]}
          onDelete={onDelete}
        />,
      );
      fireEvent.click(
        screen.getByRole('button', { name: COPY.menu.label('By hand') }),
      );
      fireEvent.click(
        screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText(DELETE.field), {
        target: { value: 'By hand' },
      });
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: new RegExp(DELETE.confirm),
        }),
      );
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(line);
      expect(
        within(dialog).getByRole('button', {
          name: new RegExp(DELETE.confirm),
        }),
      ).toBeDisabled();
    },
  );

  describe('focus after a delete removes the row', () => {
    const SHOWS = ['First', 'Middle', 'Last'].map((title, index) =>
      row({ id: `evt-${index + 1}`, title, manual: true }),
    );

    /** The page as EventsClient draws it: the heading, then the list, reloaded. */
    const Page = ({ initial }: { initial: EventListRow[] }) => {
      const [rows, setRows] = useState(initial);
      return (
        <>
          <h1 id={EVENTS_HEADING_ID} tabIndex={-1}>
            {COPY.title}
          </h1>
          <EventsList
            when="upcoming"
            rows={rows}
            onDelete={async (gone) => {
              setRows((prev) => prev.filter((each) => each.id !== gone.id));
            }}
          />
        </>
      );
    };

    const deleteShow = async (title: string) => {
      fireEvent.click(
        screen.getByRole('button', { name: COPY.menu.label(title) }),
      );
      fireEvent.click(
        screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText(DELETE.field), {
        target: { value: title },
      });
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: new RegExp(DELETE.confirm),
        }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(
        screen.queryByRole('button', { name: COPY.menu.label(title) }),
      ).toBeNull();
    };

    it('goes to the next row’s ⋯', async () => {
      render(<Page initial={SHOWS} />);
      await deleteShow('Middle');
      expect(
        screen.getByRole('button', { name: COPY.menu.label('Last') }),
      ).toHaveFocus();
    });

    it('goes to the previous row’s ⋯ when the last row went', async () => {
      render(<Page initial={SHOWS} />);
      await deleteShow('Last');
      expect(
        screen.getByRole('button', { name: COPY.menu.label('Middle') }),
      ).toHaveFocus();
    });

    it('goes to the heading when no row is left', async () => {
      render(<Page initial={SHOWS.slice(0, 1)} />);
      await deleteShow('First');
      expect(screen.getByRole('heading', { name: COPY.title })).toHaveFocus();
    });

    it('drops the target when the reload fails, so a later reload moves nothing', async () => {
      /** The delete went through but the reload failed: the row stays drawn. */
      const FailedReload = () => {
        const [rows, setRows] = useState(SHOWS);
        return (
          <>
            <h1 id={EVENTS_HEADING_ID} tabIndex={-1}>
              {COPY.title}
            </h1>
            <button
              type="button"
              onClick={() =>
                setRows((prev) => prev.filter((each) => each.id !== 'evt-2'))
              }
            >
              Later reload
            </button>
            <EventsList
              when="upcoming"
              rows={rows}
              onDelete={async () => undefined}
            />
          </>
        );
      };
      render(<FailedReload />);
      fireEvent.click(
        screen.getByRole('button', { name: COPY.menu.label('Middle') }),
      );
      fireEvent.click(
        screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText(DELETE.field), {
        target: { value: 'Middle' },
      });
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: new RegExp(DELETE.confirm),
        }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      // The row is still there, and focus is back on its own ⋯.
      expect(
        screen.getByRole('button', { name: COPY.menu.label('Middle') }),
      ).toHaveFocus();
      // Somewhere else, focus moves on; then a later reload drops the row.
      const elsewhere = screen.getByRole('button', { name: 'Later reload' });
      elsewhere.focus();
      fireEvent.click(elsewhere);
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: COPY.menu.label('Middle') }),
        ).toBeNull(),
      );
      expect(elsewhere).toHaveFocus();
      expect(
        screen.getByRole('button', { name: COPY.menu.label('Last') }),
      ).not.toHaveFocus();
    });
  });

  it('says a failed delete in Delete’s own words and keeps the dialog', async () => {
    render(
      <EventsList
        when="upcoming"
        rows={[row({ title: 'By hand', manual: true })]}
        onDelete={vi.fn(async () => {
          throw new Error('500');
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('By hand') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(DELETE.field), {
      target: { value: 'By hand' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: new RegExp(DELETE.confirm) }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Couldn’t delete “By hand”. It’s still listed.',
    );
    expect(
      within(dialog).getByRole('button', { name: new RegExp(DELETE.confirm) }),
    ).toBeEnabled();
  });

  it('renders the row dialogs left-aligned, out of the ⋯ cell’s right alignment', () => {
    render(
      <EventsList
        when="upcoming"
        rows={[row({ title: 'By hand', manual: true })]}
        onDelete={vi.fn(async () => undefined)}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('By hand') }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: new RegExp(DELETE.menu) }),
    );
    expect(screen.getByTestId('event-row-dialogs')).toHaveStyle({
      textAlign: 'left',
    });
    expect(screen.getByTestId('event-row-dialogs')).toContainElement(
      screen.getByRole('dialog'),
    );
  });

  it('draws no Hide line without onHide', () => {
    render(<EventsList when="upcoming" rows={[row({})]} />);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menu.label('Clipse & J.I.D') }),
    );
    expect(
      screen.queryByRole('menuitem', { name: new RegExp(HIDE.menu) }),
    ).toBeNull();
  });
});

describe('EventsList on the phone', () => {
  it('draws cards with the status chip and Hidden tag on a hidden show, and no Watching line', () => {
    setPhone(true);
    render(
      <EventsList
        when="upcoming"
        rows={[
          row({ hidden: true, hiddenReason: 'unsure', status: 'postponed' }),
          row({ id: 'evt-4', title: 'Cashmere', priceMin: null }),
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: COPY.title });
    const [hiddenCard, plainCard] = within(list).getAllByRole('listitem');
    const hidden = within(hiddenCard as HTMLElement);
    expect(hidden.getByText(COPY.status.postponed)).toBeInTheDocument();
    // Between the title and the venue line (`02/events-statuschip-m`).
    const text = hiddenCard?.textContent ?? '';
    const tagAt = text.indexOf(COPY.hiddenTag.unsure);
    expect(tagAt).toBeGreaterThan(text.indexOf('Clipse & J.I.D'));
    expect(tagAt).toBeLessThan(text.indexOf('Red Rocks'));
    expect(hidden.queryByText(COPY.watching(31))).toBeNull();
    const plain = within(plainCard as HTMLElement);
    expect(plain.getByText(COPY.phoneNoPrice)).toBeInTheDocument();
    expect(plain.getByText(COPY.watching(31))).toBeInTheDocument();
    expect(plain.getByRole('link')).toHaveAttribute(
      'href',
      '/admin/events/evt-4/edit',
    );
  });

  it('makes the whole past card the link to the past-show editor, by keyboard too (36/past-m)', () => {
    setPhone(true);
    render(
      <EventsList
        when="past"
        rows={[
          row({
            id: 'evt-5',
            title: 'Pink Fuzz',
            status: 'played',
            wentCount: 3,
          }),
          row({
            id: 'evt-6',
            title: 'Ninth Key',
            status: 'postponed',
            priceMin: null,
          }),
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: COPY.title });
    const [card, postponed] = within(list).getAllByRole('listitem');
    if (!(card instanceof HTMLElement) || !(postponed instanceof HTMLElement))
      throw new Error('expected two cards');
    const link = within(card).getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/events/evt-5/edit');
    // ", Thu Nov 12" holds no regex specials.
    expect(link).toHaveAccessibleName(
      new RegExp(`${COPY.rowDate('Thu Nov 12')}$`),
    );
    expect(link).toHaveTextContent('Pink Fuzz');
    expect(link).toHaveTextContent(COPY.went(3));
    expect(link).toHaveTextContent(COPY.status.played);
    link.focus();
    expect(link).toHaveFocus();
    expect(screen.queryByRole('button')).toBeNull();
    // A past card with no price draws —, and the amber line under Postponed.
    const late = within(postponed);
    expect(late.getByText(COPY.none)).toBeInTheDocument();
    expect(late.queryByText(COPY.phoneNoPrice)).toBeNull();
    expect(late.getByTestId('no-new-date')).toBeInTheDocument();
  });
});
