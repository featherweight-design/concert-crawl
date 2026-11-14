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
import { ErrorTellUsCard } from './ErrorTellUsCard';
import { loadPendingReport } from './lib/pending-report';
import { ReportRejectedError } from './lib/send-report';

const copy = CONSUMER_COPY.errorReport.card;

const sendErrorReport = vi.hoisted(() => vi.fn());
// No Clerk mock: the card posts same-origin and must not need a ClerkProvider,
// since `global-error` renders without one.
vi.mock('./lib/send-report', async (importOriginal) => ({
  // The real error class and classifier; only the network send is faked.
  ...(await importOriginal<Record<string, unknown>>()),
  sendErrorReport,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/venues/bluebird-theater?tab=x',
}));

beforeEach(() => {
  localStorage.clear();
  sendErrorReport.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(cleanup);

const pick = (chip: string) =>
  fireEvent.click(screen.getByRole('radio', { name: chip }));

describe('ErrorTellUsCard', () => {
  it('opens as the prompt: six chips as a radio group, nothing attached yet', () => {
    render(<ErrorTellUsCard digest="2849204133" />);

    expect(screen.getByRole('heading', { name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.sub)).toBeTruthy();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.queryByText(copy.attachHeading)).toBeNull();
  });

  it('one tap opens the form with that chip selected and lists what is attached', () => {
    render(<ErrorTellUsCard digest="2849204133" />);
    pick('Opening a show');

    expect(
      screen
        .getByRole('radio', { name: 'Opening a show' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByText(copy.attachHeading, { exact: false })).toBeTruthy();
    expect(screen.getByText('2849204133')).toBeTruthy();
    // Path only: the query is not shown or sent.
    expect(screen.getByText('/venues/bluebird-theater')).toBeTruthy();
    expect(screen.getByRole('button', { name: `${copy.send} →` })).toBeTruthy();
  });

  it('Cancel goes back to the prompt with nothing chosen', () => {
    render(<ErrorTellUsCard />);
    pick('Searching');
    fireEvent.click(screen.getByRole('button', { name: copy.cancel }));

    expect(screen.getByText(copy.sub)).toBeTruthy();
    expect(
      screen
        .getAllByRole('radio')
        .every((radio) => radio.getAttribute('aria-checked') === 'false'),
    ).toBe(true);
  });

  it('sends the chip and the optional note, then shows Loud and clear', async () => {
    sendErrorReport.mockResolvedValue(undefined);
    render(<ErrorTellUsCard digest="2849204133" />);
    pick('Opening a show');
    fireEvent.change(screen.getByLabelText(copy.noteLabel), {
      target: { value: 'Tapped Get tickets.' },
    });
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

    expect(
      await screen.findByRole('heading', { name: copy.sentHeading }),
    ).toBeTruthy();
    expect(sendErrorReport).toHaveBeenCalledWith(
      {
        doing: 'Opening a show',
        note: 'Tapped Get tickets.',
        digest: '2849204133',
        sentryEventId: undefined,
        page: '/venues/bluebird-theater',
      },
      expect.any(String),
    );
    expect(loadPendingReport()).toBeNull();
  });

  it('a failed send says Signal lost, keeps the report on the device, and Send again retries', async () => {
    sendErrorReport.mockRejectedValueOnce(new Error('503'));
    render(<ErrorTellUsCard digest="2849204133" />);
    pick('Searching');
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

    expect(
      await screen.findByRole('heading', { name: copy.failedHeading }),
    ).toBeTruthy();
    expect(loadPendingReport()?.doing).toBe('Searching');

    sendErrorReport.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: copy.sendAgain }));

    expect(
      await screen.findByRole('heading', { name: copy.sentHeading }),
    ).toBeTruthy();
    expect(loadPendingReport()).toBeNull();
  });

  it('keeps the failed state honest for a refused report (429): saved, as its copy says', async () => {
    sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(429));
    render(<ErrorTellUsCard digest="2849204133" />);
    pick('Searching');
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

    // PR 2 gives refused its own, unsaved state; until then the failed state
    // says "saved", so it is (the flush tries it once, then drops it).
    expect(
      await screen.findByRole('heading', { name: copy.failedHeading }),
    ).toBeTruthy();
    expect(loadPendingReport()?.doing).toBe('Searching');
  });

  it('saves a report that got a 401, for the next signed-in launch', async () => {
    sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(401));
    render(<ErrorTellUsCard digest="2849204133" />);
    pick('Searching');
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

    expect(
      await screen.findByRole('heading', { name: copy.failedHeading }),
    ).toBeTruthy();
    expect(loadPendingReport()?.doing).toBe('Searching');
  });

  it('is a real radio group: one tab stop, arrow keys move the choice', () => {
    render(<ErrorTellUsCard />);
    const radios = screen.getAllByRole('radio');
    // None chosen yet: the first chip is the single tab stop.
    expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
      '-1',
    ]);

    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
    expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
    expect(radios[1]!.getAttribute('tabindex')).toBe('0');
    expect(radios[0]!.getAttribute('tabindex')).toBe('-1');

    // It wraps at the ends.
    fireEvent.keyDown(screen.getAllByRole('radio')[1]!, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getAllByRole('radio')[0]!, { key: 'ArrowLeft' });
    expect(screen.getAllByRole('radio')[5]!.getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('Edit drops the saved copy and puts focus on the form heading', async () => {
    sendErrorReport.mockRejectedValue(new Error('503'));
    render(<ErrorTellUsCard />);
    pick('Searching');
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));
    await screen.findByRole('heading', { name: copy.failedHeading });
    expect(loadPendingReport()).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: copy.edit }));

    // The saved copy is about to be replaced; it must not go out on its own.
    expect(loadPendingReport()).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: copy.heading }),
      ),
    );
  });

  it('Edit on the failed card goes back to the form with the choice kept', async () => {
    sendErrorReport.mockRejectedValue(new Error('503'));
    render(<ErrorTellUsCard />);
    pick('My shows');
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));
    await screen.findByRole('heading', { name: copy.failedHeading });

    fireEvent.click(screen.getByRole('button', { name: copy.edit }));

    expect(
      screen
        .getByRole('radio', { name: 'My shows' })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });
});
