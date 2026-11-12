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
import { StandaloneError } from './StandaloneError';
import { STANDALONE_ERROR_COPY } from './definitions/copy';
import { readPendingReports, savePendingReport } from './lib/pending';

const copy = STANDALONE_ERROR_COPY;
const card = copy.card;

const fetchMock = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(null, { status: 201 }),
);

const clearCookies = () => {
  for (const name of ['__client_uat', '__client_uat_abc']) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  localStorage.clear();
  window.history.replaceState(null, '', '/crew/join/secret-token');
});

afterEach(() => {
  cleanup();
  clearCookies();
  vi.unstubAllGlobals();
});

const signIn = () => {
  document.cookie = '__client_uat=1731300000';
};

const renderPage = (props: Partial<Parameters<typeof StandaloneError>[0]>) =>
  render(<StandaloneError errorId="2849204133" onRetry={vi.fn()} {...props} />);

const pick = (label: string) =>
  fireEvent.click(screen.getByRole('radio', { name: label }));

describe('StandaloneError, signed out', () => {
  it('offers Try again, Go home and the error id, and no card', () => {
    const onRetry = vi.fn();
    renderPage({ onRetry });

    expect(
      screen.getByRole('heading', { level: 1, name: copy.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.signedOutBody)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.goHome })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByText('2849204133')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: copy.tryAgain }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('reads a zeroed session cookie as signed out', () => {
    document.cookie = '__client_uat=0';
    renderPage({ onSignOut: vi.fn() });
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('button', { name: copy.signOut })).toBeNull();
  });

  it('puts Try again before the other way out', () => {
    renderPage({});
    const tryAgain = screen.getByRole('button', { name: copy.tryAgain });
    const home = screen.getByRole('link', { name: copy.goHome });
    expect(
      tryAgain.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('StandaloneError, signed in', () => {
  beforeEach(signIn);

  it('asks what they were doing with six chips in a real radio group', () => {
    renderPage({ onSignOut: vi.fn() });

    expect(screen.getByText(copy.body)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: copy.signOut }),
    ).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: card.heading });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getByText(card.sub)).toBeInTheDocument();
    // The form is not open until a chip is chosen.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('counts a suffixed session cookie too', () => {
    clearCookies();
    document.cookie = '__client_uat_abc=1731300000';
    renderPage({});
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('opens the form on one tap and lists what gets attached', () => {
    renderPage({});
    pick(card.doing.opening);

    expect(
      screen.getByRole('radio', { name: card.doing.opening }),
    ).toBeChecked();
    expect(
      screen.getByRole('textbox', { name: card.note }),
    ).toBeInTheDocument();
    expect(screen.getByText(card.attachHeading)).toBeInTheDocument();
    // The invite token in the path is a capability and never shown or sent.
    expect(screen.getByText('/crew/join/[redacted]')).toBeInTheDocument();
    expect(screen.queryByText(/secret-token/)).toBeNull();
    // jsdom's agent names no platform, so only the browser part is left.
    expect(screen.queryByText(navigator.userAgent, { exact: true })).toBeNull();
  });

  it('cancels back to the prompt with nothing chosen', () => {
    renderPage({});
    pick(card.doing.searching);
    fireEvent.click(screen.getByRole('button', { name: card.cancel }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('radio', { name: card.doing.searching }),
    ).not.toBeChecked();
  });

  it('sends, shows Sending… with the form disabled, then Loud and clear', async () => {
    let finish: (res: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    renderPage({});
    pick(card.doing.opening);
    fireEvent.change(screen.getByRole('textbox', { name: card.note }), {
      target: { value: '  Tapped Get tickets and it went blank.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: card.send }));

    const sending = await screen.findByRole('button', { name: card.sending });
    expect(sending).toBeDisabled();
    expect(
      screen.getByRole('radio', { name: card.doing.opening }),
    ).toBeDisabled();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/error-report');
    expect(init.keepalive).toBe(true);
    expect(init.signal).toBeDefined();
    expect(JSON.parse(String(init.body))).toEqual({
      errorId: '2849204133',
      doing: 'opening',
      note: 'Tapped Get tickets and it went blank.',
      page: '/crew/join/[redacted]',
      device: expect.any(String),
    });

    finish(new Response(null, { status: 201 }));
    const heading = await screen.findByRole('heading', {
      name: card.sentHeading,
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.getByText(card.sentSummary(card.doing.opening, '2849204133')),
    ).toBeInTheDocument();
    expect(readPendingReports()).toEqual([]);
  });

  it('removes only its own saved copy once sent', async () => {
    savePendingReport(
      { errorId: '1111111111', doing: 'searching', page: '/', device: 'Mac' },
      'uat:1731300000',
    );
    renderPage({});
    pick(card.doing.opening);
    fireEvent.click(screen.getByRole('button', { name: card.send }));
    await screen.findByRole('heading', { name: card.sentHeading });
    expect(readPendingReports().map((entry) => entry.report.errorId)).toEqual([
      '1111111111',
    ]);
  });

  it('keeps a failed report on the device, with Send again and Edit', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    renderPage({});
    pick(card.doing.price);
    fireEvent.click(screen.getByRole('button', { name: card.send }));

    const heading = await screen.findByRole('heading', {
      name: card.failedHeading,
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText(card.failedBody)).toBeInTheDocument();
    expect(readPendingReports()).toEqual([
      expect.objectContaining({
        owner: 'uat:1731300000',
        report: expect.objectContaining({
          errorId: '2849204133',
          doing: 'price',
        }),
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: card.edit }));
    expect(screen.getByRole('radio', { name: card.doing.price })).toBeChecked();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    fireEvent.click(screen.getByRole('button', { name: card.send }));
    await screen.findByRole('heading', { name: card.failedHeading });

    fireEvent.click(screen.getByRole('button', { name: card.sendAgain }));
    await screen.findByRole('heading', { name: card.sentHeading });
    expect(readPendingReports()).toEqual([]);
  });

  it.each([422, 429])(
    'shows a %i as refused: not saved, not retried, one Done',
    async (status) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));
      renderPage({});
      pick(card.doing.price);
      fireEvent.click(screen.getByRole('button', { name: card.send }));

      const heading = await screen.findByRole('heading', {
        name: card.refusedHeading,
      });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(screen.getByText(card.refusedBody)).toBeInTheDocument();
      expect(screen.getByText(card.rail.refused)).toBeInTheDocument();
      expect(screen.getByText(card.code.refused)).toBeInTheDocument();
      expect(screen.queryByText(card.savedLabel)).toBeNull();
      expect(screen.queryByRole('button', { name: card.sendAgain })).toBeNull();
      expect(screen.queryByRole('button', { name: card.edit })).toBeNull();
      expect(readPendingReports()).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: card.done }));
      expect(
        screen.queryByRole('heading', { name: card.refusedHeading }),
      ).toBeNull();
      // The error id stays on the page.
      expect(screen.getByText('2849204133')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('treats a network failure or timeout as failed', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    renderPage({});
    pick(card.doing.other);
    fireEvent.click(screen.getByRole('button', { name: card.send }));
    await screen.findByRole('heading', { name: card.failedHeading });
  });

  it('switches to the signed-out layout when the send comes back 401', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    renderPage({ onSignOut: vi.fn() });
    pick(card.doing.myShows);
    fireEvent.click(screen.getByRole('button', { name: card.send }));

    await waitFor(() => expect(screen.queryByRole('radiogroup')).toBeNull());
    expect(screen.getByRole('link', { name: copy.goHome })).toBeInTheDocument();
    expect(screen.getByText(copy.signedOutBody)).toBeInTheDocument();
    // Saved under the session it was written in, for when they sign back in.
    expect(readPendingReports()).toEqual([
      expect.objectContaining({ owner: 'uat:1731300000' }),
    ]);
  });

  it('uses a boundary’s own wording when it passes one', () => {
    renderPage({ eyebrow: 'CONNECTION', heading: 'Crew', body: 'Crew body' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Crew' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Crew body')).toBeInTheDocument();
    expect(screen.getByText('CONNECTION')).toBeInTheDocument();
  });
});

describe('StandaloneError, embedded in the app shell', () => {
  it('drops its own logo and full height', () => {
    const { container } = renderPage({ embedded: true });
    expect(container.querySelector('.cc-err-embedded')).not.toBeNull();
    expect(screen.queryByRole('link', { name: copy.homeLinkLabel })).toBeNull();
  });
});

describe('StandaloneError, error id chip', () => {
  it('copies the id', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderPage({});
    fireEvent.click(
      screen.getByRole('button', { name: `${copy.copyErrorId} 2849204133` }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('2849204133'));
    expect(await screen.findByText(copy.copiedErrorId)).toBeInTheDocument();
  });
});
