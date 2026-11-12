// @vitest-environment jsdom

import type { ArtistReportSummary } from '@concert-crawl/types';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { ArtistReportSheet } from './ArtistReportSheet';
import { ARTIST_COPY } from './definitions/copy';

const copy = ARTIST_COPY.report;

const api = vi.hoisted(() => ({
  fileArtistReport: vi.fn(),
  withdrawArtistReport: vi.fn(),
}));

vi.mock('./lib/artist-reports', () => api);

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token', isSignedIn: true }),
}));

const summary: ArtistReportSummary = {
  id: 'rep_1',
  reason: 'different_artist',
  createdAt: '2026-11-11T12:00:00.000Z',
};

const match = {
  spotifyArtistId: '2Kx7MNY5cl1nh',
  spotifyUrl: 'https://open.spotify.com/artist/2Kx7MNY5cl1nh',
  genres: ['R&B', 'Soul'],
};

const renderSheet = (
  props: Partial<React.ComponentProps<typeof ArtistReportSheet>> = {},
) => {
  const handlers = {
    onClose: vi.fn(),
    onReported: vi.fn(),
    onWithdrawn: vi.fn(),
  };
  const view = render(
    <ArtistReportSheet
      open
      slug="puma-blue"
      name="Puma Blue"
      photoUrl={null}
      match={match}
      reported={null}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

const send = () =>
  fireEvent.click(screen.getByRole('button', { name: copy.sheet.submit }));

const pickReason = (reason: keyof typeof copy.sheet.reasons) =>
  fireEvent.click(screen.getByText(copy.sheet.reasons[reason].title));

beforeEach(() => {
  api.fileArtistReport.mockReset();
  api.withdrawArtistReport.mockReset();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe('ArtistReportSheet form', () => {
  it('shows what the page is matched to, with a safe external link', () => {
    renderSheet();

    expect(screen.getByText(copy.sheet.matchLabel)).toBeTruthy();
    expect(screen.getByText(copy.sheet.matchMeta('R&B / Soul'))).toBeTruthy();
    const link = screen.getByRole('link', {
      name: `${copy.sheet.matchLink} ${copy.sheet.newTab}`,
    });
    expect(link.getAttribute('href')).toBe(match.spotifyUrl);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('drops the genres from the meta line when the match has none on file', () => {
    renderSheet({ match: { ...match, genres: null } });

    expect(screen.getByText(copy.sheet.matchMetaNoGenres)).toBeTruthy();
  });

  it('drops the matched panel when the page has no match', () => {
    renderSheet({ match: null });

    expect(screen.queryByText(copy.sheet.matchLabel)).toBeNull();
  });

  it('keeps Send report disabled until a reason is picked', () => {
    renderSheet();
    const button = screen.getByRole('button', { name: copy.sheet.submit });
    expect(button.hasAttribute('disabled')).toBe(true);

    pickReason('wrong_photo');

    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('is a keyboard-operable radiogroup of four reasons', () => {
    renderSheet();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByRole('radiogroup')).toBeTruthy();

    const [first, second] = radios;
    fireEvent.keyDown(first as HTMLElement, { key: 'ArrowDown' });
    expect(second?.getAttribute('aria-checked')).toBe('true');
    expect(first?.getAttribute('aria-checked')).toBe('false');
  });

  it('counts the note live and stops at the cap', () => {
    renderSheet();
    const note = screen.getByLabelText(copy.sheet.noteLabel);

    fireEvent.change(note, { target: { value: 'hello' } });

    expect(screen.getByText(copy.sheet.counter(5, 280))).toBeTruthy();
    expect(note.getAttribute('maxlength')).toBe('280');
  });

  it('sends the reason, a trimmed link and a trimmed note', async () => {
    api.fileArtistReport.mockResolvedValue(summary);
    const { onReported } = renderSheet();

    pickReason('different_artist');
    fireEvent.change(screen.getByLabelText(copy.sheet.linkLabel), {
      target: { value: '  https://open.spotify.com/artist/abc  ' },
    });
    fireEvent.change(screen.getByLabelText(copy.sheet.noteLabel), {
      target: { value: ' from Austin ' },
    });
    send();

    await waitFor(() => expect(onReported).toHaveBeenCalledWith(summary));
    expect(api.fileArtistReport).toHaveBeenCalledWith(
      'puma-blue',
      {
        reason: 'different_artist',
        spotifyLink: 'https://open.spotify.com/artist/abc',
        note: 'from Austin',
      },
      'token',
    );
  });

  it('omits blank optional fields from the request', async () => {
    api.fileArtistReport.mockResolvedValue(summary);
    renderSheet();

    pickReason('other');
    send();

    await waitFor(() => expect(api.fileArtistReport).toHaveBeenCalled());
    expect(api.fileArtistReport.mock.calls[0]?.[1]).toEqual({
      reason: 'other',
    });
  });

  it('shows the link error inline and keeps the form', async () => {
    api.fileArtistReport.mockRejectedValue(
      new ApiError(
        422,
        "That isn't a Spotify artist link.",
        'invalid_spotify_link',
      ),
    );
    renderSheet();

    pickReason('different_artist');
    fireEvent.change(screen.getByLabelText(copy.sheet.linkLabel), {
      target: { value: 'nope' },
    });
    send();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(copy.sheet.linkError);
    expect(
      (screen.getByLabelText(copy.sheet.linkLabel) as HTMLInputElement).value,
    ).toBe('nope');
    expect(
      screen.getByLabelText(copy.sheet.linkLabel).getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('shows a rejected note inline on the note field', async () => {
    api.fileArtistReport.mockRejectedValue(
      new ApiError(422, 'Please keep the note civil.', 'note_rejected'),
    );
    renderSheet();

    pickReason('other');
    fireEvent.change(screen.getByLabelText(copy.sheet.noteLabel), {
      target: { value: 'rude' },
    });
    send();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Please keep the note civil.');
    expect(
      screen.getByLabelText(copy.sheet.noteLabel).getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('shows our own words, not the server message, for any other 422', async () => {
    api.fileArtistReport.mockRejectedValue(new ApiError(422, 'Invalid input'));
    renderSheet();

    pickReason('other');
    send();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(copy.sheet.noteError);
  });
});

describe('ArtistReportSheet results', () => {
  it('thanks the fan with a stub that names the reason', async () => {
    api.fileArtistReport.mockResolvedValue(summary);
    // The host swaps `reported` in from onReported; mirror it here.
    const Host = () => {
      const [reported, setReported] =
        React.useState<ArtistReportSummary | null>(null);
      return (
        <ArtistReportSheet
          open
          onClose={vi.fn()}
          slug="puma-blue"
          name="Puma Blue"
          photoUrl={null}
          match={match}
          reported={reported}
          onReported={setReported}
          onWithdrawn={vi.fn()}
        />
      );
    };
    render(<Host />);

    pickReason('different_artist');
    send();

    expect(await screen.findByText(copy.sent.title)).toBeTruthy();
    expect(screen.getByText(copy.sent.body('Puma Blue'))).toBeTruthy();
    expect(
      screen.getByText(copy.sent.stub('Puma Blue', 'different artist')),
    ).toBeTruthy();
    expect(screen.getByText(copy.sent.stubStatus)).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.sent.back })).toBeTruthy();
  });

  it('turns a 409 into Already reported and reports the open state upward', async () => {
    api.fileArtistReport.mockRejectedValue(
      new ApiError(409, 'You already have an open report', 'report_exists'),
    );
    const { onReported } = renderSheet();

    pickReason('wrong_photo');
    send();

    await waitFor(() => expect(onReported).toHaveBeenCalledTimes(1));
    expect(onReported.mock.calls[0]?.[0]).toMatchObject({
      reason: 'wrong_photo',
    });
  });

  it('clears the answers after a 409, as after a send', async () => {
    api.fileArtistReport.mockRejectedValue(
      new ApiError(409, 'You already have an open report', 'report_exists'),
    );
    const { onReported } = renderSheet();

    pickReason('wrong_photo');
    fireEvent.change(screen.getByLabelText(copy.sheet.noteLabel), {
      target: { value: 'not them' },
    });
    send();

    await waitFor(() => expect(onReported).toHaveBeenCalledTimes(1));
    // The host here never flips to Already reported, so the form stays up.
    await waitFor(() =>
      expect(screen.getByLabelText(copy.sheet.noteLabel)).toHaveProperty(
        'value',
        '',
      ),
    );
  });

  it('opens on Already reported when a report is already open', () => {
    renderSheet({ reported: summary });

    expect(screen.getByText(copy.already.title)).toBeTruthy();
    expect(screen.getByText(copy.already.body)).toBeTruthy();
    expect(screen.queryByText(copy.sheet.title)).toBeNull();
  });

  it('withdraws, clears the card state and closes', async () => {
    api.withdrawArtistReport.mockResolvedValue(undefined);
    const { onWithdrawn, onClose } = renderSheet({ reported: summary });

    fireEvent.click(
      screen.getByRole('button', { name: copy.already.withdraw }),
    );

    await waitFor(() => expect(onWithdrawn).toHaveBeenCalledTimes(1));
    expect(api.withdrawArtistReport).toHaveBeenCalledWith('puma-blue', 'token');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats a withdraw that finds nothing open as withdrawn', async () => {
    api.withdrawArtistReport.mockRejectedValue(new ApiError(404, 'None open'));
    const { onWithdrawn } = renderSheet({ reported: summary });

    fireEvent.click(
      screen.getByRole('button', { name: copy.already.withdraw }),
    );

    await waitFor(() => expect(onWithdrawn).toHaveBeenCalledTimes(1));
  });

  it('says so when a withdraw fails, and leaves the report standing', async () => {
    api.withdrawArtistReport.mockRejectedValue(new ApiError(500, 'Boom'));
    const { onWithdrawn } = renderSheet({ reported: summary });

    fireEvent.click(
      screen.getByRole('button', { name: copy.already.withdraw }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      copy.already.withdrawError,
    );
    expect(onWithdrawn).not.toHaveBeenCalled();
  });

  it('keeps the answers across a failure and resends them on Try again', async () => {
    api.fileArtistReport
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(summary);
    const { onReported } = renderSheet();

    pickReason('not_an_artist');
    fireEvent.change(screen.getByLabelText(copy.sheet.noteLabel), {
      target: { value: 'a ticket package' },
    });
    send();

    expect(await screen.findByText(copy.error.title)).toBeTruthy();
    expect(screen.getByText(copy.error.body)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: copy.error.retry }));

    await waitFor(() => expect(onReported).toHaveBeenCalledWith(summary));
    expect(api.fileArtistReport).toHaveBeenCalledTimes(2);
    expect(api.fileArtistReport.mock.calls[1]?.[1]).toEqual({
      reason: 'not_an_artist',
      note: 'a ticket package',
    });
  });

  it('says to wait, not that the server was unreachable, on a rate limit', async () => {
    api.fileArtistReport.mockRejectedValue(new ApiError(429, 'Slow down'));
    renderSheet();

    pickReason('other');
    send();

    expect(await screen.findByText(copy.error.title)).toBeTruthy();
    expect(screen.getByText(copy.error.bodyBusy)).toBeTruthy();
    expect(screen.queryByText(copy.error.body)).toBe(null);
  });

  it('says the fan was signed out when the session is gone', async () => {
    api.fileArtistReport.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    renderSheet();

    pickReason('other');
    send();

    expect(await screen.findByText(copy.error.bodySignedOut)).toBeTruthy();
  });

  it('drops a result that lands after the sheet was closed', async () => {
    let fail: (err: Error) => void = () => {};
    api.fileArtistReport.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const { onClose } = renderSheet();

    pickReason('wrong_photo');
    send();
    fireEvent.click(screen.getByRole('button', { name: copy.sheet.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fail(new TypeError('Failed to fetch'));

    // The host keeps it open here, so the next opening is this render.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: copy.sheet.submit }),
      ).toBeTruthy(),
    );
    expect(screen.queryByText(copy.error.title)).toBe(null);
  });

  it('closes from the error sheet', async () => {
    api.fileArtistReport.mockRejectedValue(new ApiError(500, 'Boom'));
    const { onClose } = renderSheet();

    pickReason('wrong_photo');
    send();
    await screen.findByText(copy.error.title);

    fireEvent.click(screen.getByRole('button', { name: copy.error.close }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
