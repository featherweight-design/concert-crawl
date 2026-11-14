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
vi.mock('@/lib/api', () => ({
  apiClient: { patch: (...args: unknown[]) => patch(...args) },
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
  extractionStrategy: 'structured_data',
  firstSeenAt: '2026-09-30T18:00:00.000Z',
  lastSeenAt: '2026-11-10T18:00:00.000Z',
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
    expect(
      await screen.findByText(COPY.saveFailed.saved(DETAIL.title)),
    ).toBeInTheDocument();
    expect(titleInput()).toHaveValue(DETAIL.title);
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
    const show = screen.getByLabelText(COPY.show.showTime);
    const doors = screen.getByLabelText(COPY.show.doors);
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
