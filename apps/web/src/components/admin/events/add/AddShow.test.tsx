// @vitest-environment jsdom

import '@testing-library/jest-dom';
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
import type { CreateResult, DuplicateShow } from './add-show-api';
import type { AddShowBody } from './add-show-rules';

const COPY = ADMIN_COPY.addShow;
const TODAY = '2026-11-20';
const MISSION = '0b9c4f3e-1d2a-4c5b-8e7f-a1b2c3d4e5f6';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

const venues = vi.fn(async () => [
  {
    id: MISSION,
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    active: true,
  },
  { id: 'v-hidden', name: 'Aardvark Hall', slug: 'aardvark', active: false },
]);
const artists = vi.fn(async (_search: string, _signal?: AbortSignal) => [
  { id: 'a1', name: 'Kaleo' },
]);
const duplicates = vi.fn(
  async (_params: {
    venueId: string;
    date: string;
    title: string;
  }): Promise<DuplicateShow[]> => [],
);
const create = vi.fn(async (_body: AddShowBody): Promise<CreateResult> => ({
  kind: 'created',
  id: 'new-1',
}));
vi.mock('./add-show-api', () => ({
  addShowApi: () => ({ venues, artists, duplicates, create }),
}));

import { AddShow } from './AddShow';

const onClose = vi.fn();
const renderIt = (phone = false) =>
  render(<AddShow phone={phone} today={TODAY} onClose={onClose} />);
const addShowButton = () => screen.getByRole('button', { name: COPY.submit });

/** Fills a valid form: title, venue, today's date and one act. */
const fill = async () => {
  fireEvent.change(screen.getByLabelText(COPY.titleField), {
    target: { value: 'Kaleo' },
  });
  fireEvent.click(screen.getByLabelText(COPY.venue));
  fireEvent.click(
    await screen.findByRole('option', { name: /Mission Ballroom/ }),
  );
  fireEvent.click(screen.getByLabelText(COPY.date));
  fireEvent.click(
    screen.getByRole('button', { name: ADMIN_COPY.eventEdit.pickers.today }),
  );
  const lineup = screen.getByRole('combobox');
  fireEvent.change(lineup, { target: { value: 'Kaleo' } });
  fireEvent.click(await screen.findByRole('option', { name: 'Kaleo' }));
};

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  push.mockClear();
  onClose.mockClear();
  create.mockClear();
  duplicates.mockClear();
  duplicates.mockImplementation(async () => []);
});
afterEach(cleanup);

describe('AddShow', () => {
  it('draws the panel with every field and the price note', async () => {
    renderIt();
    expect(
      screen.getByRole('dialog', { name: COPY.title }),
    ).toBeInTheDocument();
    for (const label of [
      COPY.titleField,
      COPY.venue,
      COPY.date,
      COPY.doors,
      COPY.show,
      COPY.ticket,
    ])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'placeholder',
      COPY.lineupField.add,
    );
    expect(screen.getByText(COPY.priceNote)).toBeInTheDocument();
    await waitFor(() => expect(venues).toHaveBeenCalled());
  });

  it('shows errors only after Add show, then keeps Add show off until fixed', async () => {
    renderIt();
    expect(screen.queryByText(COPY.errors.title_required)).toBeNull();
    fireEvent.click(addShowButton());
    for (const code of [
      'title_required',
      'venue_required',
      'date_required',
      'headliner_required',
    ] as const)
      expect(screen.getByText(COPY.errors[code])).toBeInTheDocument();
    expect(addShowButton()).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
    await fill();
    expect(addShowButton()).toBeEnabled();
  });

  it('shows a field error on leaving it', () => {
    renderIt();
    const link = screen.getByLabelText(COPY.ticket);
    fireEvent.change(link, { target: { value: 'axs.com/kaleo' } });
    fireEvent.blur(link);
    expect(
      screen.getByText(COPY.errors.ticket_url_invalid),
    ).toBeInTheDocument();
  });

  it('lists hidden venues last', async () => {
    renderIt();
    fireEvent.click(screen.getByLabelText(COPY.venue));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Mission Ballroom',
      'Aardvark Hall',
    ]);
    fireEvent.change(screen.getByTestId('venue-search'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByText(COPY.venuePicker.noMatch)).toBeInTheDocument();
  });

  it('saves the show and opens it in Event edit', async () => {
    renderIt();
    await fill();
    fireEvent.click(addShowButton());
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/events/new-1/edit'),
    );
    expect(onClose).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      venueId: MISSION,
      date: TODAY,
      title: 'Kaleo',
      doorsTime: null,
      showTime: null,
      ticketUrl: null,
      lineup: [{ name: 'Kaleo', role: 'headliner', artistId: 'a1' }],
    });
  });

  it('warns of a show already that night, and Open it leaves for it', async () => {
    duplicates.mockImplementation(async () => [
      {
        id: 'crawled-1',
        title: 'KALEO',
        showTime: '20:00:00',
        manual: false,
        hidden: false,
      },
    ]);
    renderIt();
    await fill();
    const warning = await screen.findByTestId('duplicate-warning');
    expect(warning).toHaveTextContent(
      'Mission Ballroom already has a show on Fri, Nov 20, from the crawl: KALEO',
    );
    // A warning only: Add show stays on.
    expect(addShowButton()).toBeEnabled();
    fireEvent.click(
      within(warning).getByRole('button', { name: COPY.duplicate.open }),
    );
    expect(push).toHaveBeenCalledWith('/admin/events/crawled-1/edit');
    expect(onClose).toHaveBeenCalled();
  });

  it('blocks on the exact-key 409 and offers the existing show', async () => {
    create.mockResolvedValueOnce({ kind: 'duplicate', existingId: 'same-1' });
    renderIt();
    await fill();
    fireEvent.click(addShowButton());
    const warning = await screen.findByTestId('duplicate-warning');
    expect(warning).toHaveTextContent(COPY.duplicate.exact.trim());
    expect(addShowButton()).toBeDisabled();
    fireEvent.click(
      within(warning).getByRole('button', { name: COPY.duplicate.open }),
    );
    expect(push).toHaveBeenCalledWith('/admin/events/same-1/edit');
  });

  it('puts the API’s field refusals under their fields', async () => {
    create.mockResolvedValueOnce({
      kind: 'invalid',
      issues: [{ field: 'date', code: 'date_past' }],
    });
    renderIt();
    await fill();
    fireEvent.click(addShowButton());
    expect(await screen.findByText(COPY.errors.date_past)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps the form on a failed save and tries again', async () => {
    create.mockRejectedValueOnce(new Error('offline'));
    renderIt();
    await fill();
    fireEvent.click(addShowButton());
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(COPY.saveFailed.title);
    expect(screen.getByLabelText(COPY.titleField)).toHaveValue('Kaleo');
    fireEvent.click(
      within(toast).getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/events/new-1/edit'),
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('builds the bill: Enter adds a typed name, × removes, the first is the headliner', async () => {
    renderIt();
    const input = screen.getByRole('combobox');
    for (const name of ['Kaleo', 'The Band of Heathens']) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    const chips = screen.getAllByTestId('lineup-chip');
    expect(chips[0]).toHaveTextContent(`Kaleo${COPY.lineupField.headliner}`);
    expect(chips[1]).toHaveTextContent(COPY.lineupField.support);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.lineupField.remove('Kaleo') }),
    );
    expect(screen.getAllByTestId('lineup-chip')[0]).toHaveTextContent(
      `The Band of Heathens${COPY.lineupField.headliner}`,
    );
  });

  it('reorders by drag on desktop', () => {
    renderIt();
    const input = screen.getByRole('combobox');
    for (const name of ['One', 'Two']) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    const [first, second] = screen.getAllByTestId('lineup-chip');
    if (!first || !second) throw new Error('chips');
    fireEvent.dragStart(second);
    fireEvent.drop(first);
    expect(screen.getAllByTestId('lineup-chip')[0]).toHaveTextContent('Two');
  });

  it('goes full screen on the phone, with native pickers and a move-up arrow', () => {
    renderIt(true);
    expect(screen.getByTestId('admin-sheet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: COPY.back })).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.date)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(COPY.date)).toHaveAttribute('min', TODAY);
    expect(screen.getByLabelText(COPY.doors)).toHaveAttribute('type', 'time');
    const input = screen.getByRole('combobox');
    for (const name of ['One', 'Two']) {
      fireEvent.change(input, { target: { value: name } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    fireEvent.click(
      screen.getByRole('button', { name: COPY.lineupField.moveEarlier('Two') }),
    );
    expect(screen.getAllByTestId('lineup-chip')[0]).toHaveTextContent(
      `Two${COPY.lineupField.headliner}`,
    );
  });
});
