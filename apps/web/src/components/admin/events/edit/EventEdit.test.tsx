// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { EventDetail } from './event-detail';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
  usePathname: () => '/admin/events/evt-1/edit',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('token') }),
}));
const patch = vi.fn();
const post = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    patch: (...args: unknown[]) => patch(...args),
    post: (...args: unknown[]) => post(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
const { ApiError } = await import('@/lib/api');
vi.mock('../editor/MergeEventDialog', () => ({
  MergeEventDialog: () => <div data-testid="merge-dialog" />,
}));

import { EventEdit } from './EventEdit';

const COPY = ADMIN_COPY.eventEdit;

const DETAIL: EventDetail = {
  id: 'evt-1',
  title: 'Six Foot Blonde w/ The Man is Dead',
  artist: 'Six Foot Blonde',
  date: '2026-11-14',
  doorsTime: '18:00:00',
  showTime: '19:00:00',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  status: 'available',
  hidden: false,
  hiddenReason: null,
  watchingCount: 4,
  wentCount: 18,
  isSoldOut: false,
  priceMin: '12.00',
  priceMax: null,
  submittedPriceCount: 2,
  priceRetrievedAt: '2026-11-10T18:00:00.000Z',
  ticketUrl: 'https://www.larimerlounge.com/events/1',
  mySubmission: null,
  extractionStrategy: 'structured_data',
  firstSeenAt: '2026-09-30T18:00:00.000Z',
  lastSeenAt: '2026-11-10T18:00:00.000Z',
  delistedAt: null,
  venueUrl: 'https://larimer.example/shows/1',
};

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
  patch.mockReset();
  post.mockReset();
  push.mockReset();
  refresh.mockReset();
});
afterEach(cleanup);

const titleInput = () =>
  screen.getByLabelText(COPY.show.titleField) as HTMLInputElement;

describe('EventEdit', () => {
  it('draws the header, the Show card and From the crawl', () => {
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    expect(
      screen.getByRole('heading', { level: 1, name: DETAIL.title }),
    ).toBeInTheDocument();
    // `19/event-edit-hidden-header`: date · venue, no Watching count.
    expect(
      screen.getByText(COPY.meta('Sat Nov 14', 'Larimer Lounge')),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('hidden-tag')).toBeNull();
    expect(
      screen.getByRole('link', { name: COPY.onVenueSite }),
    ).toHaveAttribute('href', DETAIL.venueUrl);
    expect(screen.getByLabelText(COPY.show.venue)).toHaveValue(
      'Larimer Lounge',
    );
    expect(screen.getByLabelText(COPY.show.venue)).toHaveAttribute('readonly');
    // Date and times open their pickers (`04/date-picker-d`, `time-picker-d`).
    expect(screen.getByLabelText(COPY.show.date)).toHaveTextContent(
      'Sat, Nov 14, 2026',
    );
    expect(screen.getByLabelText(COPY.show.doors)).toHaveTextContent('6:00 PM');
    expect(
      screen.getByText(COPY.crawl.sourceValue('Larimer Lounge', 'JSON-LD')),
    ).toBeInTheDocument();
    expect(screen.getByText('Sep 30')).toBeInTheDocument();
    expect(screen.getByText('Nov 10')).toBeInTheDocument();
  });

  it('counts an edit, discards it, and saves the trimmed title', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    const save = screen.getByTestId('event-edit-save');
    expect(save).toBeDisabled();

    fireEvent.change(titleInput(), { target: { value: 'Something else' } });
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.discard }));
    expect(titleInput()).toHaveValue(DETAIL.title);

    fireEvent.change(titleInput(), { target: { value: '  New title ' } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        title: 'New title',
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('snaps back and says what is saved when the save fails', async () => {
    patch.mockRejectedValue(new Error('500'));
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.change(titleInput(), { target: { value: 'New title' } });
    fireEvent.click(screen.getByTestId('event-edit-save'));
    // The toast wraps the saved line with its own words, so match a fragment.
    expect(await screen.findByText(/The title is still/)).toBeInTheDocument();
    // The snap-back lands in the render after the toast's.
    await waitFor(() => expect(titleInput()).toHaveValue(DETAIL.title));
  });

  it('names the date passed on a postponed show, never Played', () => {
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'postponed' }}
        today="2026-11-20"
      />,
    );
    expect(screen.getByTestId('event-edit-meta')).toHaveTextContent(
      COPY.passed.meta('Sat Nov 14', 'Larimer Lounge'),
    );
  });

  it('says why a refused save was refused, with no Try again', async () => {
    patch.mockRejectedValue(new ApiError(409, 'duplicate_show'));
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.change(titleInput(), { target: { value: 'New title' } });
    fireEvent.click(screen.getByTestId('event-edit-save'));
    expect(
      await screen.findByText(
        new RegExp(ADMIN_COPY.events.errors.duplicateShow),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    ).toBeNull();
  });

  it('opens the merge dialog from the ⋯', () => {
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(screen.getByTestId('event-edit-menu'));
    fireEvent.click(screen.getByTestId('event-edit-menu-merge'));
    expect(screen.getByTestId('merge-dialog')).toBeInTheDocument();
  });

  it('stacks on the phone with the short venue link and Doors after Show', () => {
    setPhone(true);
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    expect(
      screen.getByRole('link', { name: COPY.onVenueSitePhone }),
    ).toBeInTheDocument();
    // The phone uses the OS date picker (addendum-5 README).
    expect(screen.getByLabelText(COPY.show.date)).toHaveValue('2026-11-14');
    expect(screen.getByTestId('event-edit-menu')).toBeInTheDocument();
    // Date and Show side by side, as drawn, then Doors.
    // "Show" also names the card, so take the time field by its id.
    const show = document.getElementById('event-edit-show-time');
    const doors = document.getElementById('event-edit-doors');
    if (show === null || doors === null) throw new Error('fields missing');
    expect(
      show.compareDocumentPosition(doors) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps Save off for an empty title', () => {
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.change(titleInput(), { target: { value: '   ' } });
    expect(screen.getByTestId('event-edit-save')).toBeDisabled();
  });
});

describe('EventEdit Status card', () => {
  const pill = (key: string) => screen.getByTestId(`status-pill-${key}`);

  it('drafts Sold out into the Save bar, then marks it sold out', async () => {
    patch.mockResolvedValue({});
    post.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    expect(pill('available')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pill('soldout'));
    expect(pill('soldout')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/v1/admin/events/evt-1/sold-out',
        'token',
        {},
      ),
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it('puts a postponed, sold-out show back on sale', async () => {
    patch.mockResolvedValue({});
    post.mockResolvedValue({});
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'postponed', isSoldOut: true }}
        today="2026-11-13"
      />,
    );
    fireEvent.click(pill('available'));
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/v1/admin/events/evt-1/available',
        'token',
        {},
      ),
    );
    expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
      status: 'upcoming',
    });
  });

  it('marks a postponed show sold out and back on, and a delisted one too', async () => {
    patch.mockResolvedValue({});
    post.mockResolvedValue({});
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'postponed' }}
        today="2026-11-13"
      />,
    );
    fireEvent.click(pill('soldout'));
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/v1/admin/events/evt-1/sold-out',
        'token',
        {},
      ),
    );
    expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
      status: 'upcoming',
    });
    cleanup();
    patch.mockClear();
    render(
      <EventEdit
        detail={{
          ...DETAIL,
          status: 'delisted',
          delistedAt: '2026-11-10T09:00:00.000Z',
        }}
        today="2026-11-13"
      />,
    );
    // `04/listed-again`: read-only, then Listed again brings the pills back
    // with the earlier status picked, as an unsaved change.
    expect(screen.getByTestId('status-delisted')).toHaveTextContent(
      COPY.status.delistedSince('Nov 10'),
    );
    expect(screen.queryByTestId('status-pill-available')).toBeNull();
    fireEvent.click(screen.getByTestId('listed-again'));
    expect(pill('available')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('status-listed-back')).toHaveTextContent(
      COPY.status.listedBack(COPY.status.available),
    );
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        status: 'upcoming',
      }),
    );
  });

  it('refreshes after a partial save, so the page shows what landed', async () => {
    patch.mockResolvedValue({});
    post.mockRejectedValue(new Error('500'));
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'postponed' }}
        today="2026-11-13"
      />,
    );
    fireEvent.click(pill('soldout'));
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByText(/The status is still/)).toBeInTheDocument();
  });

  it('confirms Postponed in a dialog, with no new date yet', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(pill('postponed'));
    fireEvent.click(
      screen.getByRole('button', { name: COPY.postponed.confirm }),
    );
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        status: 'postponed',
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('moves a postponed show to a New date, and waits for a real change', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(pill('postponed'));
    fireEvent.click(
      screen.getByRole('button', { name: COPY.postponed.newDate }),
    );
    const confirm = screen.getByRole('button', {
      name: COPY.postponed.confirm,
    });
    // The same day and time is no new date.
    expect(confirm).toBeDisabled();
    fireEvent.click(document.getElementById('postponed-date') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Fri, Nov 20, 2026' }));
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        status: 'postponed',
        date: '2026-11-20',
        showTime: '19:00:00',
      }),
    );
  });

  it('edits the date on the Show card, and keeps a past show’s in the past', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    // The field is named by its label, not the date it shows.
    fireEvent.click(screen.getByLabelText(COPY.show.date));
    fireEvent.click(screen.getByRole('button', { name: 'Sun, Nov 15, 2026' }));
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        date: '2026-11-15',
      }),
    );
    cleanup();
    patch.mockClear();
    render(<EventEdit detail={DETAIL} today="2026-11-20" />);
    fireEvent.click(screen.getByLabelText(COPY.show.date));
    // A played show's correction stays before today: the API refuses later.
    expect(
      screen.getByRole('button', { name: 'Fri, Nov 20, 2026' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: COPY.pickers.today }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Thu, Nov 12, 2026' }));
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        date: '2026-11-12',
      }),
    );
  });

  it('keeps the Postponed dialog open and says so when it fails', async () => {
    patch.mockRejectedValue(new Error('500'));
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(pill('postponed'));
    fireEvent.click(
      screen.getByRole('button', { name: COPY.postponed.confirm }),
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: COPY.postponed.confirm }),
    ).toBeInTheDocument();
  });

  it('hides from the toggle through the dialog, and from the ⋯', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(screen.getByRole('switch', { name: COPY.status.hide }));
    expect(
      screen.getByText(COPY.hide.body(DETAIL.artist, 4)),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.hide.confirm }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        hiddenFromConsumer: true,
      }),
    );
    cleanup();
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(screen.getByTestId('event-edit-menu'));
    fireEvent.click(screen.getByTestId('event-edit-menu-hide'));
    expect(screen.getByText(COPY.hide.foot)).toBeInTheDocument();
  });

  it('tags a hidden show in the header with the list tag, not a second chip', () => {
    render(
      <EventEdit
        detail={{ ...DETAIL, hidden: true, hiddenReason: 'unsure' }}
        today="2026-11-13"
      />,
    );
    const tag = screen.getByTestId('hidden-tag');
    expect(tag).toHaveTextContent(ADMIN_COPY.eventsList.hiddenTag.unsure);
    // Addendum 6 item 21: 10px in --fg-muted, the eye the same colour.
    expect(tag.style.color).toBe('var(--fg-muted)');
    // The old second chip ("Hidden: unsure") is gone.
    expect(screen.queryByText(/^Hidden: unsure$/)).toBeNull();
  });

  it('puts the meta under the title and the chips below it on the phone, in reading order', () => {
    setPhone(true);
    render(
      <EventEdit
        detail={{ ...DETAIL, hidden: true, hiddenReason: 'admin' }}
        today="2026-11-13"
      />,
    );
    const meta = screen.getByTestId('event-edit-meta');
    const tag = screen.getByTestId('hidden-tag');
    expect(meta).toHaveTextContent(COPY.meta('Sat Nov 14', 'Larimer Lounge'));
    expect(meta.style.fontSize).toBe('12.5px');
    expect(
      meta.compareDocumentPosition(tag) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText(/Watching/)).toBeNull();
  });

  it('names a show with no venue by its date alone', () => {
    render(
      <EventEdit detail={{ ...DETAIL, venueName: null }} today="2026-11-13" />,
    );
    expect(screen.getByText(COPY.meta('Sat Nov 14', null))).toBeInTheDocument();
  });

  it('shows a hidden show again at once, with no dialog', async () => {
    patch.mockResolvedValue({});
    render(
      <EventEdit
        detail={{ ...DETAIL, hidden: true, hiddenReason: 'admin' }}
        today="2026-11-13"
      />,
    );
    fireEvent.click(screen.getByRole('switch', { name: COPY.status.hide }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        hiddenFromConsumer: false,
      }),
    );
  });

  it('holds Cancelled, names a delisted show, and reads a past one only', () => {
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    expect(pill('cancelled')).toHaveAttribute('aria-disabled', 'true');
    cleanup();
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'delisted' }}
        today="2026-11-13"
      />,
    );
    expect(screen.getByTestId('status-delisted')).toHaveTextContent(
      COPY.status.delisted,
    );
    cleanup();
    render(
      <EventEdit detail={{ ...DETAIL, status: 'played' }} today="2026-11-20" />,
    );
    expect(screen.queryByTestId('status-pill-soldout')).toBeNull();
    expect(screen.getByTestId('status-past')).toHaveTextContent(
      `Sat Nov 14 · ${COPY.past.went(18)}`,
    );
    expect(screen.getByText(COPY.past.noStatus('played'))).toBeInTheDocument();
    // Hide from site still works on a past show.
    expect(
      screen.getByRole('switch', { name: COPY.status.hide }),
    ).toBeInTheDocument();
  });
});

describe('EventEdit past show (B+ addendum 6 item 36)', () => {
  const PLAYED: EventDetail = { ...DETAIL, status: 'played' };

  it('banners a played show and corrects its title, times and date', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={PLAYED} today="2026-11-20" />);
    expect(screen.getByTestId('event-edit-banner')).toHaveTextContent(
      COPY.past.banner,
    );
    // The Save bar waits for a change.
    expect(screen.queryByTestId('event-edit-save-bar')).toBeNull();
    expect(titleInput()).not.toHaveAttribute('readonly');
    // Venue stays read-only until the 4b venue work.
    expect(screen.getByLabelText(COPY.show.venue)).toHaveAttribute('readonly');
    fireEvent.change(titleInput(), { target: { value: 'Six Foot Blonde' } });
    fireEvent.click(screen.getByLabelText(COPY.show.doors));
    fireEvent.click(screen.getByRole('option', { name: '7:30 PM' }));
    expect(screen.getByText(COPY.saveBar.unsaved(2))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('event-edit-save'));
    // Only the corrections the API takes on a past show.
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        title: 'Six Foot Blonde',
        doorsTime: '19:30:00',
      }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('reads a played show’s price as a record', () => {
    render(<EventEdit detail={PLAYED} today="2026-11-20" />);
    expect(screen.queryByTestId('event-edit-price-edit')).toBeNull();
    expect(screen.getByText(COPY.past.priceRecord)).toBeInTheDocument();
  });

  it('says a refused correction in the past-locked words', async () => {
    patch.mockRejectedValue(new ApiError(409, 'past_locked'));
    render(<EventEdit detail={PLAYED} today="2026-11-20" />);
    fireEvent.change(titleInput(), { target: { value: 'Other' } });
    fireEvent.click(screen.getByTestId('event-edit-save'));
    expect(
      await screen.findByText(new RegExp(ADMIN_COPY.events.errors.pastLocked)),
    ).toBeInTheDocument();
  });

  it('stacks banner, Show, Status, Price on the phone, with a one-row Save bar', () => {
    setPhone(true);
    render(<EventEdit detail={PLAYED} today="2026-11-20" />);
    const order = [
      'event-edit-banner',
      'event-edit-show',
      'event-edit-status',
      'event-edit-price',
    ].map((id) => screen.getByTestId(id));
    order.slice(1).forEach((card, i) => {
      const before = order[i];
      if (before === undefined) throw new Error('missing card');
      expect(
        before.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    fireEvent.change(titleInput(), { target: { value: 'Other' } });
    // `36/past-show-m`: count, Discard and Save in one row.
    expect(screen.getByTestId('event-edit-save-bar').style.flexDirection).toBe(
      'row',
    );
    expect(screen.getByText(COPY.saveBar.unsaved(1))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: COPY.saveBar.discard }),
    ).toBeInTheDocument();
  });

  it('words a past cancelled show as in the past, not played', () => {
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'cancelled' }}
        today="2026-11-20"
      />,
    );
    expect(screen.getByTestId('event-edit-banner')).toHaveTextContent(
      COPY.past.bannerNotPlayed,
    );
    expect(
      screen.getByText(COPY.past.noStatus('cancelled')),
    ).toBeInTheDocument();
    expect(screen.queryByText(COPY.past.banner)).toBeNull();
    expect(screen.queryByText(COPY.past.noStatus('played'))).toBeNull();
  });

  it('words a past delisted show as in the past, not played', () => {
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'delisted' }}
        today="2026-11-20"
      />,
    );
    expect(screen.getByTestId('event-edit-banner')).toHaveTextContent(
      COPY.past.bannerNotPlayed,
    );
    expect(
      screen.getByText(COPY.past.noStatus('delisted')),
    ).toBeInTheDocument();
    // A past show never offers Listed again: the pills are gone.
    expect(screen.queryByTestId('listed-again')).toBeNull();
  });

  it('holds a passed postponed show’s sale pills until it has a new date', async () => {
    patch.mockResolvedValue({});
    post.mockResolvedValue({});
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'postponed', isSoldOut: true }}
        today="2026-11-20"
      />,
    );
    const available = screen.getByTestId('status-pill-available');
    const soldout = screen.getByTestId('status-pill-soldout');
    expect(available).toHaveAttribute('aria-disabled', 'true');
    expect(soldout).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(available);
    fireEvent.click(soldout);
    // Nothing drafted: no Save, no status write, no sold-out call.
    expect(screen.getByTestId('event-edit-save')).toBeDisabled();
    // A title fix saves alone, with no status and no sale endpoint.
    fireEvent.change(titleInput(), { target: { value: 'Other' } });
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        title: 'Other',
      }),
    );
    expect(post).not.toHaveBeenCalled();
    // A new date frees them.
    fireEvent.click(screen.getByLabelText(COPY.passed.newDate));
    fireEvent.click(screen.getByRole('button', { name: 'Fri, Nov 27, 2026' }));
    expect(screen.getByTestId('status-pill-available')).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('never sends a sale write on a played show', async () => {
    patch.mockResolvedValue({});
    render(
      <EventEdit
        detail={{ ...DETAIL, status: 'played', isSoldOut: true }}
        today="2026-11-20"
      />,
    );
    fireEvent.change(titleInput(), { target: { value: 'Other' } });
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        title: 'Other',
      }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps a passed postponed show on the upcoming editor, asking for its new date', async () => {
    patch.mockResolvedValue({});
    const passed: EventDetail = { ...DETAIL, status: 'postponed' };
    render(<EventEdit detail={passed} today="2026-11-20" />);
    const banner = screen.getByTestId('event-edit-banner');
    expect(banner).toHaveTextContent(COPY.passed.bannerLead('Sat Nov 14'));
    expect(banner).toHaveTextContent(COPY.passed.bannerBody(4));
    expect(screen.getByLabelText(COPY.passed.originalDate)).toHaveValue(
      'Sat, Nov 14, 2026',
    );
    // The pills stay, Postponed chosen; Save bar as on an upcoming show.
    expect(screen.getByTestId('status-pill-postponed')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('event-edit-save-bar')).toBeInTheDocument();
    expect(screen.getByTestId('event-edit-new-date-hint')).toHaveTextContent(
      COPY.passed.notSet(4),
    );
    const newDate = screen.getByLabelText(COPY.passed.newDate);
    expect(newDate).toHaveTextContent(COPY.passed.pick);
    fireEvent.click(newDate);
    // New date takes future dates only.
    expect(
      screen.getByRole('button', { name: 'Thu, Nov 19, 2026' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Fri, Nov 27, 2026' }));
    expect(screen.queryByTestId('event-edit-new-date-hint')).toBeNull();
    fireEvent.click(screen.getByTestId('event-edit-save'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token', {
        date: '2026-11-27',
      }),
    );
  });
});
