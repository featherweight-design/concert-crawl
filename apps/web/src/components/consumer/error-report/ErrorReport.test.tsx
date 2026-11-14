// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { ErrorReport } from './ErrorReport';
import { loadPendingReport } from './lib/pending-report';
import { ReportRejectedError } from './lib/send-report';

const card = CONSUMER_COPY.errorReport.card;
const page = CONSUMER_COPY.error;

const sendErrorReport = vi.hoisted(() => vi.fn());
vi.mock('./lib/send-report', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  sendErrorReport,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/venues/bluebird-theater',
}));
const captureException = vi.hoisted(() => vi.fn(() => 'evt-1'));
vi.mock('@sentry/nextjs', () => ({
  captureException,
  isEnabled: () => true,
}));

beforeEach(() => {
  localStorage.clear();
  sendErrorReport.mockReset();
  captureException.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(cleanup);

const pickAndSend = (chip: string) => {
  fireEvent.click(screen.getByRole('radio', { name: chip }));
  fireEvent.click(screen.getByRole('button', { name: `${card.send} →` }));
};

describe('ErrorReport (the error page with its Tell us card)', () => {
  it('signed in: the card, and the second action the boundary gives', () => {
    render(
      <ErrorReport
        error={Object.assign(new Error('x'), { digest: '4471' })}
        onRetry={vi.fn()}
        signedIn
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByTestId('error-tell-us-card')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: page.signOutButton }),
    ).toBeTruthy();
    expect(screen.getByText(page.errorBody)).toBeTruthy();
  });

  it('signed out: no card, Go home, the body that names no Sign out', () => {
    render(
      <ErrorReport
        error={Object.assign(new Error('x'), { digest: '4471' })}
        onRetry={vi.fn()}
        signedIn={false}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
    expect(screen.getByRole('link', { name: page.goHomeButton })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: page.signOutButton }),
    ).toBeNull();
    expect(screen.getByText(page.signedOutBody)).toBeTruthy();
    expect(screen.getByText('4471')).toBeTruthy();
  });

  it('a 401 on send switches the page to the signed-out layout and keeps the report saved', async () => {
    sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(401));
    render(
      <ErrorReport
        error={Object.assign(new Error('x'), { digest: '4471' })}
        onRetry={vi.fn()}
        signedIn
        onSignOut={vi.fn()}
      />,
    );
    pickAndSend('Searching');

    await waitFor(() =>
      expect(screen.queryByTestId('error-tell-us-card')).toBeNull(),
    );
    expect(screen.getByRole('link', { name: page.goHomeButton })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: page.signOutButton }),
    ).toBeNull();
    expect(screen.getByText(page.signedOutBody)).toBeTruthy();
    // Saved for the next signed-in launch (the flush keeps a 401 too).
    expect(loadPendingReport()?.doing).toBe('Searching');
  });

  it('refused, then Done: the card closes, the error ID stays and takes focus', async () => {
    sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(429));
    render(
      <ErrorReport
        error={Object.assign(new Error('x'), { digest: '4471' })}
        onRetry={vi.fn()}
        signedIn
        onSignOut={vi.fn()}
      />,
    );
    pickAndSend('Searching');
    const heading = await screen.findByRole('heading', {
      name: card.refusedHeading,
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(loadPendingReport()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: card.done }));

    expect(screen.queryByTestId('error-tell-us-card')).toBeNull();
    const chip = screen.getByRole('button', { name: /4471/ });
    await waitFor(() => expect(document.activeElement).toBe(chip));
    // Still signed in: Sign out stays.
    expect(
      screen.getByRole('button', { name: page.signOutButton }),
    ).toBeTruthy();
  });

  describe('the error ID', () => {
    it('a client throw (no digest) gets a minted id, shown and sent as the digest', async () => {
      sendErrorReport.mockResolvedValueOnce(undefined);
      const error = new Error('client');
      render(
        <ErrorReport
          error={error}
          onRetry={vi.fn()}
          signedIn
          onSignOut={vi.fn()}
        />,
      );

      const chip = await screen.findByRole('button', {
        name: /c-[0-9a-z]{10}/,
      });
      const id = /c-[0-9a-z]{10}/.exec(chip.textContent ?? '')?.[0];
      expect(id).toMatch(/^[\w-]{1,64}$/);
      // Tagged on its Sentry event, so a report can be matched to it.
      expect(captureException).toHaveBeenCalledWith(error, {
        tags: { error_id: id },
      });

      pickAndSend('Searching');
      await screen.findByRole('heading', { name: card.sentHeading });
      expect(sendErrorReport).toHaveBeenCalledWith(
        expect.objectContaining({ digest: id, sentryEventId: 'evt-1' }),
        expect.any(String),
      );
    });

    it('the same error keeps its id across a remount', async () => {
      const error = new Error('client');
      const first = render(
        <ErrorReport error={error} onRetry={vi.fn()} signedIn={false} />,
      );
      const id = (await screen.findByRole('button', { name: /c-[0-9a-z]{10}/ }))
        .textContent;
      first.unmount();

      render(<ErrorReport error={error} onRetry={vi.fn()} signedIn={false} />);
      expect(
        (await screen.findByRole('button', { name: /c-[0-9a-z]{10}/ }))
          .textContent,
      ).toBe(id);
      expect(captureException).toHaveBeenCalledTimes(1);
    });

    it('a server digest is shown and sent as is, never replaced', async () => {
      sendErrorReport.mockResolvedValueOnce(undefined);
      render(
        <ErrorReport
          error={Object.assign(new Error('server'), { digest: '2849204133' })}
          onRetry={vi.fn()}
          signedIn
          onSignOut={vi.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: /2849204133/ })).toBeTruthy();
      expect(screen.queryByText(/c-[0-9a-z]{10}/)).toBeNull();
      // Already reported by onRequestError: not captured again here.
      expect(captureException).not.toHaveBeenCalled();

      pickAndSend('Searching');
      await screen.findByRole('heading', { name: card.sentHeading });
      expect(sendErrorReport).toHaveBeenCalledWith(
        expect.objectContaining({
          digest: '2849204133',
          sentryEventId: undefined,
        }),
        expect.any(String),
      );
    });
  });
});
