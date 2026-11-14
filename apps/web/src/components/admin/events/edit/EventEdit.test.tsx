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
}));
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
    expect(screen.getByText(COPY.meta('Sat Nov 14', 4))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: COPY.onVenueSite }),
    ).toHaveAttribute('href', DETAIL.venueUrl);
    expect(screen.getByLabelText(COPY.show.venue)).toHaveValue(
      'Larimer Lounge',
    );
    expect(screen.getByLabelText(COPY.show.venue)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(COPY.show.date)).toHaveValue(
      'Sat, Nov 14, 2026',
    );
    expect(screen.getByLabelText(COPY.show.doors)).toHaveValue('6:00 PM');
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

  it('locks a past show: no Save bar, the title reads only', () => {
    render(<EventEdit detail={DETAIL} today="2026-11-20" />);
    expect(titleInput()).toHaveAttribute('readonly');
    expect(screen.queryByTestId('event-edit-save-bar')).toBeNull();
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
    expect(screen.getByLabelText(COPY.show.date)).toHaveValue('Sat, Nov 14');
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

  it('confirms Postponed in a dialog, with New date held', async () => {
    patch.mockResolvedValue({});
    render(<EventEdit detail={DETAIL} today="2026-11-13" />);
    fireEvent.click(pill('postponed'));
    expect(
      screen.getByRole('button', { name: COPY.postponed.newDate }),
    ).toBeDisabled();
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

  it('holds Cancelled, names a delisted show, and locks a past one', () => {
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
    render(<EventEdit detail={DETAIL} today="2026-11-20" />);
    expect(pill('soldout')).toHaveAttribute('aria-disabled', 'true');
  });
});
