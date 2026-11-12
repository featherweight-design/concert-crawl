// @vitest-environment jsdom

import '@testing-library/jest-dom';
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const mutateAsync = vi.fn();
const showStampedToast = vi.fn();
const showRemovedToast = vi.fn();
const showAttendanceError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/history',
}));
vi.mock('@/lib/queries/use-attending-toggle', () => ({
  useAttendingToggle: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@/components/consumer/going/lib/attendance-toasts', () => ({
  showStampedToast: (arg: unknown) => showStampedToast(arg),
  showRemovedToast: (arg: unknown) => showRemovedToast(arg),
  showAttendanceError: (arg: unknown) => showAttendanceError(arg),
}));

import { GOING_COPY } from '@/components/consumer/going/definitions/copy';
import { stampColorsFor } from '@/lib/passport/stamp';
import { WentPill } from './WentPill';

const pill = (
  attending: boolean | null,
  extra: Partial<React.ComponentProps<typeof WentPill>> = {},
) =>
  render(
    <WentPill
      eventId="ev1"
      artist="Nightjar Choir"
      venueSlug="larimer-lounge"
      venueName="Larimer Lounge"
      dateLabel="Jun 21, 2026"
      attending={attending}
      {...extra}
    />,
  );

describe('WentPill', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ going: true, attendingAt: 'x' });
    push.mockReset();
    showStampedToast.mockReset();
    showRemovedToast.mockReset();
    showAttendanceError.mockReset();
  });
  afterEach(cleanup);

  it('reads "I went" and names the show for an unstamped night', () => {
    pill(false);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent(GOING_COPY.button.pastNo);
    expect(button).toHaveAccessibleName(
      GOING_COPY.past.ariaWent('Nightjar Choir', 'Jun 21, 2026'),
    );
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  // artist_past_m: the pill takes its venue's colour, so two venues on one
  // page are two colours (not the artist's hash).
  it('fills "Went" in its venue colour', () => {
    pill(true);
    expect(screen.getByRole('button').style.background).toBe(
      stampColorsFor('larimer-lounge').ring,
    );
    cleanup();
    pill(true, { venueSlug: 'red-rocks-amphitheatre' });
    expect(screen.getByRole('button').style.background).toBe(
      stampColorsFor('red-rocks-amphitheatre').ring,
    );
  });

  it('reads "Went" for a stamped night', () => {
    pill(true);
    expect(screen.getByRole('button')).toHaveTextContent(
      GOING_COPY.past.wentPill,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    // The name does not change with the state: `aria-pressed` carries "on".
    expect(screen.getByRole('button')).toHaveAccessibleName(
      GOING_COPY.past.ariaWent('Nightjar Choir', 'Jun 21, 2026'),
    );
  });

  it('stamps on tap and offers the Passport by default', async () => {
    pill(false);
    fireEvent.click(screen.getByRole('button'));
    // Answers the tap at once, before the server does.
    expect(screen.getByRole('button')).toHaveTextContent(
      GOING_COPY.past.wentPill,
    );
    expect(mutateAsync).toHaveBeenCalledWith({ eventId: 'ev1', going: true });
    await waitFor(() => expect(showStampedToast).toHaveBeenCalled());
    const arg = showStampedToast.mock.calls[0]?.[0] as {
      onOpenPassport?: () => void;
      onUndo?: () => void;
    };
    expect(arg.onUndo).toBeUndefined();
    arg.onOpenPassport?.();
    expect(push).toHaveBeenCalledWith('/passport');
  });

  it('offers an Undo instead when asked, and Undo takes the stamp back out', async () => {
    pill(false, { afterStamp: 'undo' });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(showStampedToast).toHaveBeenCalled());
    const arg = showStampedToast.mock.calls[0]?.[0] as {
      onOpenPassport?: () => void;
      onUndo?: () => void;
    };
    expect(arg.onOpenPassport).toBeUndefined();
    arg.onUndo?.();
    expect(mutateAsync).toHaveBeenLastCalledWith({
      eventId: 'ev1',
      going: false,
    });
  });

  it('rolls back and raises the error toast when the stamp fails', async () => {
    mutateAsync.mockRejectedValue(new Error('down'));
    pill(false);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(showAttendanceError).toHaveBeenCalledWith('save'),
    );
    expect(screen.getByRole('button')).toHaveTextContent(
      GOING_COPY.button.pastNo,
    );
  });

  it('takes a stamp back out on tap, with an Undo carrying the restore token', async () => {
    const restore = { attendingAt: '2026-06-21T00:00:00.000Z', token: 't' };
    mutateAsync.mockResolvedValue({ going: false, attendingAt: null, restore });
    pill(true);
    fireEvent.click(screen.getByRole('button'));
    expect(mutateAsync).toHaveBeenCalledWith({ eventId: 'ev1', going: false });
    await waitFor(() => expect(showRemovedToast).toHaveBeenCalled());
    const arg = showRemovedToast.mock.calls[0]?.[0] as {
      onUndo: (() => void) | null;
    };
    arg.onUndo?.();
    expect(mutateAsync).toHaveBeenLastCalledWith({
      eventId: 'ev1',
      going: true,
      restore,
    });
  });

  it('sends a signed-out tap to sign-in and writes nothing', () => {
    pill(null);
    fireEvent.click(screen.getByRole('button'));
    expect(push).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/history')}`,
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
