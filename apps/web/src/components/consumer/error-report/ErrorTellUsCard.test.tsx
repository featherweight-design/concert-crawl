// @vitest-environment jsdom
import type { ComponentProps } from 'react';
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

// The page's two handlers are required; a test that cares passes its own.
const Card = (props: Partial<ComponentProps<typeof ErrorTellUsCard>>) => (
  <ErrorTellUsCard onDone={vi.fn()} onSignedOut={vi.fn()} {...props} />
);

describe('ErrorTellUsCard', () => {
  it('opens as the prompt: six chips as a radio group, nothing attached yet', () => {
    render(<Card digest="2849204133" />);

    expect(screen.getByRole('heading', { name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.sub)).toBeTruthy();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.queryByText(copy.attachHeading)).toBeNull();
  });

  it('one tap opens the form with that chip selected and lists what is attached', () => {
    render(<Card digest="2849204133" />);
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
    render(<Card />);
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
    render(<Card digest="2849204133" />);
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
    render(<Card digest="2849204133" />);
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

  it('leaves its edge to the sheet-edge utility (global-error injects the fallback itself)', () => {
    const { container } = render(<Card />);
    const card = screen.getByTestId('error-tell-us-card');
    expect(card.classList.contains('sheet-edge')).toBe(true);
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).not.toContain('border-box');
  });

  describe('refused (addendum-2 18-error-page/error-report-refused-m)', () => {
    it.each([429, 422, 400])(
      '%i says Not sent. under the LIMIT rail, is not saved, and takes focus',
      async (status) => {
        sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(status));
        render(<Card digest="2849204133" />);
        pick('Searching');
        fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

        const heading = await screen.findByRole('heading', {
          name: copy.refusedHeading,
        });
        expect(screen.getByText(copy.refusedBody)).toBeTruthy();
        expect(screen.getByText(copy.failedEyebrow)).toBeTruthy();
        expect(screen.getByText(copy.refusedTag)).toBeTruthy();
        // Board error-report-refused-m sizes.
        expect(heading.style.fontSize).toBe('22px');
        expect(screen.getByText(copy.refusedBody).style.fontSize).toBe(
          '13.5px',
        );
        const doneStyle = screen.getByRole('button', { name: copy.done }).style;
        expect(doneStyle.borderRadius).toBe('12px');
        expect(doneStyle.fontSize).toBe('14.5px');
        // One button only: Done. No Edit, no Send again.
        expect(
          screen.getAllByRole('button').map((button) => button.textContent),
        ).toEqual([copy.done]);
        expect(loadPendingReport()).toBeNull();
        await waitFor(() => expect(document.activeElement).toBe(heading));
      },
    );

    it('leaves a report another error page saved where it is', async () => {
      localStorage.setItem(
        'cc-pending-error-report',
        JSON.stringify({
          doing: 'My shows',
          note: '',
          page: '/me',
          savedAt: Date.now(),
        }),
      );
      sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(429));
      render(<Card digest="2849204133" />);
      pick('Searching');
      fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

      await screen.findByRole('heading', { name: copy.refusedHeading });
      expect(loadPendingReport()?.doing).toBe('My shows');
    });

    it('Send again that is refused drops the copy this card saved', async () => {
      sendErrorReport.mockRejectedValueOnce(new Error('503'));
      render(<Card digest="2849204133" />);
      pick('Searching');
      fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));
      await screen.findByRole('heading', { name: copy.failedHeading });
      expect(loadPendingReport()?.doing).toBe('Searching');

      sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(429));
      fireEvent.click(screen.getByRole('button', { name: copy.sendAgain }));

      await screen.findByRole('heading', { name: copy.refusedHeading });
      // The refused copy says "it isn't saved", so it is not.
      expect(loadPendingReport()).toBeNull();
    });

    it('Done hands the close to the page', async () => {
      const onDone = vi.fn();
      sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(429));
      render(<Card digest="2849204133" onDone={onDone} />);
      pick('Searching');
      fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));
      await screen.findByRole('heading', { name: copy.refusedHeading });

      fireEvent.click(screen.getByRole('button', { name: copy.done }));
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('a refused Send again leaves the slot alone once another page saved over this card’s copy', async () => {
      sendErrorReport.mockRejectedValueOnce(new Error('503'));
      render(<Card digest="2849204133" />);
      pick('Searching');
      fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));
      await screen.findByRole('heading', { name: copy.failedHeading });
      const ours = loadPendingReport();
      expect(ours?.doing).toBe('Searching');

      // Another error page (another tab) saves its own report into the slot.
      localStorage.setItem(
        'cc-pending-error-report',
        JSON.stringify({
          doing: 'My shows',
          note: '',
          page: '/me',
          savedAt: (ours?.savedAt ?? 0) + 1,
        }),
      );

      sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(429));
      fireEvent.click(screen.getByRole('button', { name: copy.sendAgain }));

      await screen.findByRole('heading', { name: copy.refusedHeading });
      expect(loadPendingReport()?.doing).toBe('My shows');
    });
  });

  it('a 401 saves the report for the next signed-in launch and tells the page', async () => {
    const onSignedOut = vi.fn();
    sendErrorReport.mockRejectedValueOnce(new ReportRejectedError(401));
    render(<Card digest="2849204133" onSignedOut={onSignedOut} />);
    pick('Searching');
    fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

    await waitFor(() => expect(onSignedOut).toHaveBeenCalledTimes(1));
    expect(loadPendingReport()?.doing).toBe('Searching');
  });

  it.each([new ReportRejectedError(503), new ReportRejectedError(408)])(
    'a transient failure (%s) is the failed state, saved',
    async (failure) => {
      sendErrorReport.mockRejectedValueOnce(failure);
      render(<Card digest="2849204133" />);
      pick('Searching');
      fireEvent.click(screen.getByRole('button', { name: `${copy.send} →` }));

      expect(
        await screen.findByRole('heading', { name: copy.failedHeading }),
      ).toBeTruthy();
      expect(loadPendingReport()?.doing).toBe('Searching');
    },
  );

  it('is a real radio group: one tab stop, arrow keys move the choice', () => {
    render(<Card />);
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
    render(<Card />);
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
    render(<Card />);
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
