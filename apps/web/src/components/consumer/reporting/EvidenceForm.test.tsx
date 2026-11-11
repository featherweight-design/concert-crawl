// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ER_POLICY } from '@concert-crawl/types';
import { EvidenceForm } from './EvidenceForm';
import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.evidenceForm;

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token' }),
}));
vi.mock('@/lib/events', () => ({
  fileEventReport: vi.fn(),
  withdrawEventReport: vi.fn(),
}));

import { ApiError } from '@/lib/api';
import { fileEventReport, withdrawEventReport } from '@/lib/events';

const renderForm = (eventDate: string) =>
  render(
    <EvidenceForm
      open
      onClose={vi.fn()}
      reportType="cancelled"
      eventId="event-1"
      eventDate={eventDate}
    />,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('EvidenceForm confirm threshold', () => {
  it('quotes the usual count for a show more than a week out', () => {
    renderForm('2026-11-20');
    expect(
      screen.getByText(copy.promotionNote(ER_POLICY.confirmsRequired)),
    ).toBeTruthy();
  });

  it('quotes the imminent count in the footer, matching the warning, on the threshold day', () => {
    // Exactly imminentThresholdDays out: the API counts this day as imminent.
    renderForm('2026-11-05');
    expect(
      screen.getByText(copy.promotionNote(ER_POLICY.confirmsRequiredImminent)),
    ).toBeTruthy();
    expect(
      screen.getByText(
        copy.imminentWarning(
          ER_POLICY.imminentThresholdDays,
          ER_POLICY.confirmsRequiredImminent,
          ER_POLICY.confirmsRequired,
        ),
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(copy.promotionNote(ER_POLICY.confirmsRequired)),
    ).toBeNull();
  });
});

describe('EvidenceForm second report', () => {
  const alreadyCopy = copy.alreadyReported;

  const fileAgain = async (ownReportId: string | null) => {
    vi.mocked(fileEventReport).mockRejectedValueOnce(
      new ApiError(
        409,
        'You already have an unresolved report for this event',
        'report_exists',
      ),
    );
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      <EvidenceForm
        open
        onClose={onClose}
        onSuccess={onSuccess}
        reportType="cancelled"
        eventId="event-1"
        eventDate="2026-11-20"
        ownReportId={ownReportId}
      />,
    );
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    await act(async () => {
      fireEvent.click(screen.getByText(copy.submitButton));
    });
    return { onSuccess, onClose };
  };

  it('shows Already reported instead of the raw 409 message', async () => {
    await fileAgain('report-9');
    expect(screen.getByText(alreadyCopy.heading)).toBeTruthy();
    expect(
      screen.queryByText(
        'You already have an unresolved report for this event',
      ),
    ).toBeNull();
  });

  it("withdraws the viewer's own report from the Already reported state", async () => {
    const { onSuccess } = await fileAgain('report-9');
    await act(async () => {
      fireEvent.click(screen.getByText(alreadyCopy.withdrawButton));
    });
    expect(withdrawEventReport).toHaveBeenCalledWith(
      'event-1',
      'report-9',
      'token',
    );
    // Back on the form, with the chosen method still selected, to file again.
    expect(screen.queryByText(alreadyCopy.heading)).toBeNull();
    expect(screen.getAllByRole('radio')[0]!.getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('says so when the withdraw fails', async () => {
    vi.mocked(withdrawEventReport).mockRejectedValueOnce(new Error('down'));
    await fileAgain('report-9');
    await act(async () => {
      fireEvent.click(screen.getByText(alreadyCopy.withdrawButton));
    });
    expect(screen.getByRole('alert').textContent).toBe(
      alreadyCopy.withdrawError,
    );
  });

  it("offers only See your report when the page doesn't know the report", async () => {
    const { onSuccess } = await fileAgain(null);
    expect(screen.queryByText(alreadyCopy.withdrawButton)).toBeNull();
    fireEvent.click(screen.getByText(alreadyCopy.seeReportButton));
    expect(onSuccess).toHaveBeenCalled();
  });

  it('still shows other errors as text', async () => {
    vi.mocked(fileEventReport).mockRejectedValueOnce(
      new Error('Note rejected.'),
    );
    render(
      <EvidenceForm
        open
        onClose={vi.fn()}
        reportType="cancelled"
        eventId="event-1"
        eventDate="2026-11-20"
      />,
    );
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    await act(async () => {
      fireEvent.click(screen.getByText(copy.submitButton));
    });
    expect(screen.getByText('Note rejected.')).toBeTruthy();
    expect(screen.queryByText(alreadyCopy.heading)).toBeNull();
  });
});
