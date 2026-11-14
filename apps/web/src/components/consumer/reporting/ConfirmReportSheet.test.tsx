// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ConfirmReportSheet } from './ConfirmReportSheet';
import { REPORTING_COPY } from './definitions/copy';

const copy = REPORTING_COPY.confirmReportSheet;

let isSignedIn = true;
let isLoaded = true;

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isLoaded, isSignedIn, getToken: async () => 'token' }),
}));

const confirmEventReport = vi.fn(async (..._args: unknown[]) => ({
  confirmed: true,
  confirmsCount: 1,
  resolved: false,
}));
vi.mock('@/lib/events', () => ({
  confirmEventReport: (...args: unknown[]) => confirmEventReport(...args),
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/events/evt_1',
}));

const onClose = vi.fn();

const renderSheet = () =>
  render(
    <ConfirmReportSheet
      open
      onClose={onClose}
      reportType="cancelled"
      reporter={null}
      reportedAt="2026-09-01T02:00:00.000Z"
      eventId="evt_1"
      reportId="rep_1"
      onFileCounter={vi.fn()}
    />,
  );

beforeEach(() => {
  isSignedIn = true;
  isLoaded = true;
  push.mockClear();
  onClose.mockClear();

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

describe('ConfirmReportSheet', () => {
  afterEach(cleanup);

  it('shows the confirm surface to a signed-in user', () => {
    renderSheet();

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText(copy.confirmButton)).toBeTruthy();
  });

  it('sends a signed-out visitor to sign-in', () => {
    isSignedIn = false;
    renderSheet();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      `/sign-in?redirect_url=${encodeURIComponent('/events/evt_1')}`,
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    // The confirm button used to render and then silently no-op, because
    // getToken() returned null and handleConfirm bailed without saying so.
    expect(screen.queryByText(copy.confirmButton)).toBe(null);
  });

  it('does not redirect while Clerk is still loading', () => {
    isLoaded = false;
    isSignedIn = false;
    renderSheet();

    expect(push).not.toHaveBeenCalled();
  });

  // B+ A3: how the confirmer knows reaches the server and is stored.
  it('sends the chosen method with the confirm', async () => {
    renderSheet();
    fireEvent.click(screen.getAllByRole('radio')[1]!);
    await act(async () => {
      fireEvent.click(screen.getByText(copy.confirmButton));
    });
    expect(confirmEventReport).toHaveBeenCalledWith(
      'evt_1',
      'rep_1',
      'token',
      'own_evidence',
    );
  });

  // more-st-confirm_rep_m: the lead sentence, then one mono line naming who,
  // how and the way to look.
  it('recaps the report as its lead and one attribution line', () => {
    render(
      <ConfirmReportSheet
        open
        onClose={vi.fn()}
        reportType="postponed"
        reporter={{ handle: '@sami', url: '' }}
        reportedAt="2026-09-01T02:00:00.000Z"
        evidenceMethod="venue_site"
        evidenceUrl="https://venue.example/post"
        eventId="evt_1"
        reportId="rep_1"
      />,
    );
    const recap = screen.getByTestId('confirm-recap');
    expect(recap).toHaveTextContent(copy.recapCard.lead.postponed);
    const line = screen.getByTestId('confirm-recap-attribution');
    expect(line).toHaveTextContent('Reported by @sami');
    expect(line).toHaveTextContent('Venue site');
    const link = screen.getByRole('link', {
      name: REPORTING_COPY.pendingReportBanner.viewEvidenceAria,
    });
    expect(link.getAttribute('href')).toBe('https://venue.example/post');
  });

  it('draws no VIEW link for an unsafe evidence URL', () => {
    render(
      <ConfirmReportSheet
        open
        onClose={vi.fn()}
        reportType="cancelled"
        reporter={{ handle: '@sami', url: '' }}
        evidenceMethod="venue_site"
        evidenceUrl="javascript:alert(1)"
        eventId="evt_1"
        reportId="rep_1"
      />,
    );
    expect(
      screen.queryByRole('link', {
        name: REPORTING_COPY.pendingReportBanner.viewEvidenceAria,
      }),
    ).toBeNull();
  });

  it("uses the board's option subtitles", () => {
    renderSheet();
    expect(screen.getByText('The link or post they pointed to.')).toBeTruthy();
    expect(
      screen.getByText("An email, a post or the venue's site."),
    ).toBeTruthy();
    expect(screen.getByText('Staff, box office or the promoter.')).toBeTruthy();
  });

  it('sets the caution as plain text and files a counter-report from a signal link', () => {
    renderSheet();
    const caution = screen.getByTestId('confirm-caution');
    expect(caution).toHaveTextContent(copy.cautionNote);
    expect(caution.style.border).toBe('');
    expect(caution.querySelector('svg')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: copy.counterReportLink }),
    ).toBeTruthy();
    expect(screen.getByText(copy.counterReportLead)).toBeTruthy();
  });
});
