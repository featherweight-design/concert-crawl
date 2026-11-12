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
import { PausePanel } from './PausePanel';

const COPY = ADMIN_COPY.pausePanel;
const ONE = [{ id: 'v1', name: 'Ball Arena', eventCount: 235 }];

const submitButton = () => screen.getByRole('button', { name: COPY.submit });

beforeEach(() => {
  // Noon in Denver on Thu Nov 12, 2026.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T19:00:00Z'));
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PausePanel', () => {
  it('sends Other with its note and a two-week resume', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<PausePanel venues={ONE} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText(COPY.reasons.other));
    // Other needs its note before it can be sent.
    expect(submitButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(COPY.noteLabel), {
      target: { value: '  Ticketmaster migration this week  ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: COPY.resumeChoices.twoWeeks }),
    );
    expect(screen.getByText(COPY.resumesOn('Thu, Nov 26'))).toBeInTheDocument();
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        reason: 'other',
        note: 'Ticketmaster migration this week',
        resume: { mode: 'in_days', days: 14 },
      }),
    );
  });

  it('picks a date in the calendar, and dims today and earlier', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<PausePanel venues={ONE} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(
      screen.getByRole('button', { name: COPY.resumeChoices.date }),
    );
    expect(submitButton()).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Thursday, November 12' }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Monday, November 16' }),
    );
    expect(screen.getByText(COPY.resumesOn('Mon, Nov 16'))).toBeInTheDocument();
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        reason: 'waiting_on_permission',
        resume: { mode: 'on', date: '2026-11-16' },
      }),
    );
  });

  it('shows an API date refusal inline', async () => {
    const onSubmit = vi.fn().mockResolvedValue('Pick a date within a year');
    render(<PausePanel venues={ONE} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(submitButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pick a date within a year',
    );
  });

  it('counts from Denver’s today on a Denver evening, when UTC is already tomorrow', async () => {
    // Nov 13 02:00 UTC is Nov 12, 7 PM in Denver.
    vi.setSystemTime(new Date('2026-11-13T02:00:00Z'));
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<PausePanel venues={ONE} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(
      screen.getByRole('button', { name: COPY.resumeChoices.twoWeeks }),
    );
    expect(screen.getByText(COPY.resumesOn('Thu, Nov 26'))).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: COPY.resumeChoices.date }),
    );
    expect(
      screen.getByRole('button', { name: 'Thursday, November 12' }),
    ).toBeDisabled();
    const first = screen.getByRole('button', { name: 'Friday, November 13' });
    expect(first).toBeEnabled();
    fireEvent.click(first);
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        reason: 'waiting_on_permission',
        resume: { mode: 'on', date: '2026-11-13' },
      }),
    );
  });

  it('gives the phone sheet a Cancel, since its handle is decoration', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const onClose = vi.fn();
    render(<PausePanel venues={ONE} onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('admin-sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: COPY.cancel }));
    expect(onClose).toHaveBeenCalled();
  });

  it('reopens on a refused body with its refusal inline', () => {
    render(
      <PausePanel
        venues={ONE}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        refused={{
          body: {
            reason: 'waiting_on_permission',
            resume: { mode: 'on', date: '2026-11-13' },
          },
          error: 'Pick a date after today',
        }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Pick a date after today',
    );
    expect(
      screen.getByRole('button', { name: COPY.resumeChoices.date }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Friday, November 13' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('titles a bulk pause by its count and sums the shows', () => {
    render(
      <PausePanel
        venues={[...ONE, { id: 'v2', name: 'Globe Hall', eventCount: 42 }]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(COPY.titleMany(2))).toBeInTheDocument();
    expect(screen.getByText(COPY.bodyMany(277))).toBeInTheDocument();
  });
});
