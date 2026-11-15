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
import { fieldDate } from '../edit/event-detail';
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
const BEFORE: ReadonlySet<string> = new Set(['older-twin']);
const manualIdsBefore = vi.fn(
  async (_body: AddShowBody): Promise<ReadonlySet<string>> => BEFORE,
);
const findCreated = vi.fn(
  async (
    _body: AddShowBody,
    _before: ReadonlySet<string>,
  ): Promise<string | null> => null,
);
vi.mock('./add-show-api', () => ({
  addShowApi: () => ({
    venues,
    artists,
    duplicates,
    create,
    manualIdsBefore,
    findCreated,
  }),
}));

import { AddShow } from './AddShow';

const onClose = vi.fn();
const renderIt = (phone = false) =>
  render(<AddShow phone={phone} onClose={onClose} />);
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
  // Only the clock: noon in Denver on TODAY, so `todayInDenver()` reads it.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T19:00:00Z`));
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
  manualIdsBefore.mockClear();
  findCreated.mockClear();
  findCreated.mockImplementation(async () => null);
  venues.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
    // Leaves exactly once.
    expect(push).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      venueId: MISSION,
      date: TODAY,
      title: 'Kaleo',
      doorsTime: null,
      showTime: null,
      ticketUrl: null,
      lineup: [{ name: 'Kaleo', role: 'headliner', artistId: 'a1' }],
    });
    // The night's manual shows are read before the POST, for a timeout.
    expect(manualIdsBefore).toHaveBeenCalledWith(create.mock.calls[0]?.[0]);
    expect(manualIdsBefore.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0] ?? 0,
    );
    expect(findCreated).not.toHaveBeenCalled();
  });

  it('opens the show a timed-out save did add', async () => {
    create.mockResolvedValueOnce({ kind: 'timeout' });
    findCreated.mockResolvedValueOnce('landed-1');
    renderIt();
    await fill();
    fireEvent.click(addShowButton());
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/events/landed-1/edit'),
    );
    expect(findCreated).toHaveBeenCalledWith(create.mock.calls[0]?.[0], BEFORE);
    expect(onClose).toHaveBeenCalled();
  });

  it('says it may have been added when a timed-out save finds no show, with Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      create.mockResolvedValueOnce({ kind: 'timeout' });
      renderIt();
      await fill();
      fireEvent.click(addShowButton());
      const toast = await screen.findByTestId('save-failed');
      expect(toast).toHaveTextContent(COPY.saveFailed.maybe);
      expect(toast).not.toHaveTextContent(COPY.saveFailed.body);
      expect(findCreated).toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      fireEvent.click(
        within(toast).getByRole('button', {
          name: ADMIN_COPY.states.saveFailed.tryAgain,
        }),
      );
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith('/admin/events/new-1/edit'),
      );
      expect(manualIdsBefore).toHaveBeenCalledTimes(2);
    } finally {
      vi.mocked(console.error).mockRestore();
    }
  });

  it('still saves when the before-read fails, and a timeout then says it may have been added', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      manualIdsBefore.mockRejectedValueOnce(new Error('read down'));
      create.mockResolvedValueOnce({ kind: 'timeout' });
      renderIt();
      await fill();
      fireEvent.click(addShowButton());
      const toast = await screen.findByTestId('save-failed');
      expect(create).toHaveBeenCalledTimes(1);
      // No before-set, so an older twin can't be told apart: no guess.
      expect(findCreated).not.toHaveBeenCalled();
      expect(toast).toHaveTextContent(COPY.saveFailed.maybe);
      expect(
        within(toast).getByRole('button', {
          name: ADMIN_COPY.states.saveFailed.tryAgain,
        }),
      ).toBeInTheDocument();
    } finally {
      vi.mocked(console.error).mockRestore();
    }
  });

  it('saves the show when the before-read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      manualIdsBefore.mockRejectedValueOnce(new Error('read down'));
      renderIt();
      await fill();
      fireEvent.click(addShowButton());
      await waitFor(() =>
        expect(push).toHaveBeenCalledWith('/admin/events/new-1/edit'),
      );
    } finally {
      vi.mocked(console.error).mockRestore();
    }
  });

  it('never navigates when the form closes mid-save', async () => {
    let resolve: (result: CreateResult) => void = () => undefined;
    create.mockImplementationOnce(
      () =>
        new Promise<CreateResult>((done) => {
          resolve = done;
        }),
    );
    const { unmount } = renderIt();
    await fill();
    fireEvent.click(addShowButton());
    await waitFor(() => expect(create).toHaveBeenCalled());
    unmount();
    resolve({ kind: 'created', id: 'late-1' });
    await new Promise((done) => {
      setTimeout(done, 0);
    });
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks the fields, Escape and the scrim while saving, and sends one POST', async () => {
    let resolve: (result: CreateResult) => void = () => undefined;
    create.mockImplementationOnce(
      () =>
        new Promise<CreateResult>((done) => {
          resolve = done;
        }),
    );
    renderIt();
    await fill();
    fireEvent.click(addShowButton());
    fireEvent.click(addShowButton());
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(screen.getByLabelText(COPY.titleField)).toBeDisabled();
    expect(screen.getByLabelText(COPY.ticket)).toBeDisabled();
    expect(screen.getByLabelText(COPY.venue)).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('side-panel-scrim'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(addShowButton());
    resolve({ kind: 'created', id: 'new-1' });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledTimes(1);
    expect(manualIdsBefore).toHaveBeenCalledTimes(1);
  });

  it('wires Title’s error to aria-invalid and aria-describedby', () => {
    renderIt();
    const title = screen.getByLabelText(COPY.titleField);
    expect(title).not.toHaveAttribute('aria-invalid');
    expect(title).not.toHaveAttribute('aria-describedby');
    fireEvent.click(addShowButton());
    expect(title).toHaveAttribute('aria-invalid', 'true');
    const describedBy = title.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      COPY.errors.title_required,
    );
  });

  it('announces the first error after Add show, politely', () => {
    renderIt();
    const announcer = screen.getByTestId('add-show-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveTextContent('');
    fireEvent.click(addShowButton());
    expect(announcer).toHaveTextContent(COPY.errors.title_required);
  });

  it('keeps the warning while the title changes, and clears it on a new date', async () => {
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
    await screen.findByTestId('duplicate-warning');
    const calls = duplicates.mock.calls.length;
    fireEvent.change(screen.getByLabelText(COPY.titleField), {
      target: { value: 'Kaleo live' },
    });
    // Still drawn while the next check is pending.
    expect(screen.getByTestId('duplicate-warning')).toBeInTheDocument();
    await waitFor(() =>
      expect(duplicates.mock.calls.length).toBeGreaterThan(calls),
    );
    expect(screen.getByTestId('duplicate-warning')).toBeInTheDocument();
    // Another night clears it at once.
    duplicates.mockImplementation(async () => []);
    fireEvent.click(screen.getByLabelText(COPY.date));
    fireEvent.click(
      screen.getByRole('button', { name: fieldDate('2026-11-21', true) }),
    );
    expect(screen.queryByTestId('duplicate-warning')).toBeNull();
  });

  it('shows a form-level refusal, with no Try again, for a 400 it can’t place', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      create.mockResolvedValueOnce({ kind: 'invalid', issues: [] });
      renderIt();
      await fill();
      fireEvent.click(addShowButton());
      const toast = await screen.findByTestId('save-failed');
      expect(toast).toHaveTextContent(COPY.saveFailed.title);
      expect(toast).toHaveTextContent(COPY.saveFailed.refused);
      expect(
        within(toast).queryByRole('button', {
          name: ADMIN_COPY.states.saveFailed.tryAgain,
        }),
      ).toBeNull();
      expect(push).not.toHaveBeenCalled();
      // Editing a field clears it.
      fireEvent.change(screen.getByLabelText(COPY.titleField), {
        target: { value: 'Kaleo live' },
      });
      expect(screen.queryByTestId('save-failed')).toBeNull();
    } finally {
      vi.mocked(console.error).mockRestore();
    }
  });

  it('loads the venues again on Try again after a failed load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      venues.mockRejectedValueOnce(new Error('down'));
      renderIt();
      const retry = await screen.findByRole('button', {
        name: COPY.venuePicker.tryAgain,
      });
      fireEvent.click(retry);
      // Back to loading at once, then the list.
      expect(screen.getByLabelText(COPY.venue)).toHaveAttribute(
        'aria-busy',
        'true',
      );
      await waitFor(() =>
        expect(screen.getByLabelText(COPY.venue)).not.toHaveAttribute(
          'aria-busy',
        ),
      );
      expect(venues).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByRole('button', { name: COPY.venuePicker.tryAgain }),
      ).toBeNull();
      fireEvent.click(screen.getByLabelText(COPY.venue));
      expect(
        await screen.findByRole('option', { name: /Mission Ballroom/ }),
      ).toBeInTheDocument();
    } finally {
      vi.mocked(console.error).mockRestore();
    }
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
    // Focus moves to the existing show's Open it.
    await waitFor(() =>
      expect(
        within(warning).getByRole('button', { name: COPY.duplicate.open }),
      ).toHaveFocus(),
    );
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
    // Focus moves to the refused field, and the error is announced.
    await waitFor(() => expect(screen.getByLabelText(COPY.date)).toHaveFocus());
    expect(screen.getByTestId('add-show-announcer')).toHaveTextContent(
      COPY.errors.date_past,
    );
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
    // Try again reads the night afresh before its own POST.
    expect(manualIdsBefore).toHaveBeenCalledTimes(2);
    const [, secondRead] = manualIdsBefore.mock.invocationCallOrder;
    const [firstCreate, secondCreate] = create.mock.invocationCallOrder;
    expect(secondRead).toBeGreaterThan(firstCreate ?? Infinity);
    expect(secondRead).toBeLessThan(secondCreate ?? 0);
  });

  it('says it may have been added when finding a timed-out show throws, with Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      create.mockResolvedValueOnce({ kind: 'timeout' });
      findCreated.mockRejectedValueOnce(new Error('read down'));
      renderIt();
      await fill();
      fireEvent.click(addShowButton());
      const toast = await screen.findByTestId('save-failed');
      expect(findCreated).toHaveBeenCalledTimes(1);
      expect(toast).toHaveTextContent(COPY.saveFailed.maybe);
      expect(toast).not.toHaveTextContent(COPY.saveFailed.body);
      expect(
        within(toast).getByRole('button', {
          name: ADMIN_COPY.states.saveFailed.tryAgain,
        }),
      ).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    } finally {
      vi.mocked(console.error).mockRestore();
    }
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
