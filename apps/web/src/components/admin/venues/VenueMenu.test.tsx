// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { SaveFailedToast } from '@/components/admin/primitives';

const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

const mockHide = vi.fn();
const mockRemove = vi.fn();
const mockTryDelete = vi.fn();
const mockResume = vi.fn();
const mockFeatured = vi.fn();
const mockActivate = vi.fn();
const mockPause = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  activateVenue: (...args: unknown[]) => mockActivate(...args),
  hideVenue: (...args: unknown[]) => mockHide(...args),
  pauseCrawling: (...args: unknown[]) => mockPause(...args),
  removeVenue: (...args: unknown[]) => mockRemove(...args),
  resumeCrawling: (...args: unknown[]) => mockResume(...args),
  setVenueFeatured: (...args: unknown[]) => mockFeatured(...args),
  tryDeleteVenue: (...args: unknown[]) => mockTryDelete(...args),
}));

import { VenueMenu, type VenueMenuFailure } from './VenueMenu';
import { deleteBlockersOf } from './delete-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueHeader;
const MENU = COPY.menu;
const CONFIRMS = ADMIN_COPY.venueConfirms;

const matchMediaStub = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

const buildVenue = (
  overrides: Partial<VenueWithCrawlHealth> = {},
): VenueWithCrawlHealth => ({
  id: 'venue-1',
  name: 'Ball Arena',
  slug: 'ball-arena',
  websiteUrl: 'https://ballarena.example.com',
  city: 'Denver',
  timezone: 'America/Denver',
  active: true,
  verified: true,
  verifiedBy: null,
  verifiedAt: null,
  lastCrawledAt: null,
  crawlNotes: null,
  crawlDelayMs: 3000,
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: null,
  consecutiveFailures: 0,
  blockedAt: null,
  crawlPausedAt: null,
  removedAt: null,
  extractionStrategy: null,
  contactEmail: null,
  priceUrl: null,
  ticketVendor: null,
  debugCaptureHtml: false,
  crawlMode: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  address: null,
  capacity: null,
  venueType: null,
  about: null,
  neighborhood: null,
  featured: false,
  lat: null,
  lng: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  crawlHealth: {
    sevenDayPercent: 100,
    sparkline: [],
    lastCrawledAt: null,
    avgDurationMs: null,
    eventsTracked: 300,
    consecutiveFails: 0,
  },
  deleteBlockers: { pastShows: 65, upcomingShows: 235, watchers: 12 },
  ...overrides,
});

const PAUSED = {
  crawlPausedAt: '2026-10-28T18:00:00.000Z',
  crawlPauseReason: 'waiting_on_permission',
  crawlPausedByName: '@hugh',
} as const;

const HIDDEN = {
  active: false,
  hiddenAt: '2026-11-02T18:00:00.000Z',
  hiddenReason: 'venue_closed',
  hiddenByName: '@hugh',
} as const;

const REMOVED = { ...HIDDEN, removedAt: '2026-11-02T18:00:00.000Z' } as const;

const NO_BLOCKERS = { pastShows: 0, upcomingShows: 0, watchers: 0 };

const onFailure = vi.fn<(failure: VenueMenuFailure | null) => void>();

const trigger = () =>
  screen.getByRole('button', { name: COPY.menuLabel('Ball Arena') });

const openMenu = (venue: VenueWithCrawlHealth) => {
  render(<VenueMenu venue={venue} onFailure={onFailure} />);
  fireEvent.click(trigger());
};

/** Each row as "label|hint", in order. */
const rows = () =>
  screen.getAllByRole('menuitem').map((item) => {
    const [label, hint] = Array.from(item.querySelectorAll('span > span'));
    return `${label?.textContent ?? ''}|${hint?.textContent ?? ''}`;
  });

const row = (key: string) => screen.getByTestId(`venue-menu-${key}`);

const typeVenueName = (value: string) =>
  fireEvent.change(screen.getByLabelText(CONFIRMS.remove.field), {
    target: { value },
  });

beforeEach(() => {
  vi.stubGlobal('matchMedia', matchMediaStub);
  for (const mock of [
    mockRefresh,
    mockPush,
    mockHide,
    mockRemove,
    mockTryDelete,
    mockResume,
    mockFeatured,
    mockActivate,
    mockPause,
    onFailure,
  ])
    mock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('VenueMenu — rows per state', () => {
  it('crawling: Pause, Make flagship, Hide with the count, Take down', () => {
    openMenu(buildVenue());
    expect(rows()).toEqual([
      `${MENU.pause}|${MENU.pauseHint}`,
      `${MENU.makeFlagship}|${MENU.makeFlagshipHint}`,
      `${MENU.hide}|${MENU.hideHint(235)}`,
      `${MENU.takeDown}|${MENU.takeDownHint}`,
    ]);
  });

  it('a flagship offers Remove flagship', () => {
    openMenu(buildVenue({ featured: true }));
    expect(rows()[1]).toBe(`${MENU.removeFlagship}|${MENU.removeFlagshipHint}`);
  });

  it('paused: Resume with who paused it and why', () => {
    openMenu(buildVenue(PAUSED));
    expect(rows()).toEqual([
      `${MENU.resume}|Paused by @hugh, Oct 28: waiting on permission.`,
      `${MENU.makeFlagship}|${MENU.makeFlagshipHint}`,
      `${MENU.hide}|${MENU.hideHint(235)}`,
      `${MENU.takeDown}|${MENU.takeDownHint}`,
    ]);
  });

  it('auto-paused: Resume says why, Hide drops the count', () => {
    openMenu(
      buildVenue({
        crawlPausedAt: '2026-10-28T18:00:00.000Z',
        consecutiveFailures: 3,
      }),
    );
    expect(rows()).toEqual([
      `${MENU.resume}|Auto-paused after 3 failures.`,
      `${MENU.makeFlagship}|${MENU.makeFlagshipHint}`,
      `${MENU.hide}|${MENU.hideHint(null)}`,
      `${MENU.takeDown}|${MENU.takeDownHint}`,
    ]);
  });

  it('a hand pause with a reason and 3+ failures stays a hand pause, as the chip says', () => {
    openMenu(buildVenue({ ...PAUSED, consecutiveFailures: 4 }));
    expect(rows()[0]).toBe(
      `${MENU.resume}|Paused by @hugh, Oct 28: waiting on permission.`,
    );
    expect(rows()[2]).toBe(`${MENU.hide}|${MENU.hideHint(235)}`);
  });

  it('blocked while paused shares the auto-paused menu', () => {
    openMenu(buildVenue({ ...PAUSED, blockedAt: '2026-10-28T18:00:00.000Z' }));
    expect(rows()[2]).toBe(`${MENU.hide}|${MENU.hideHint(null)}`);
  });

  it('hidden: Show on site with who hid it, Pause, Delete, Take down', () => {
    openMenu(buildVenue({ ...HIDDEN, deleteBlockers: NO_BLOCKERS }));
    expect(rows()).toEqual([
      `${MENU.show}|Hidden by @hugh, Nov 2: venue closed.`,
      // Its shows are already off the site, so not "Shows stay listed".
      `${MENU.pause}|${MENU.pauseHintHidden}`,
      `${MENU.delete}|${MENU.deleteHint}`,
      `${MENU.takeDown}|${MENU.takeDownHint}`,
    ]);
    expect(row('delete').getAttribute('aria-disabled')).toBeNull();
  });

  it('hidden and paused: the crawl row is Resume, and it runs', async () => {
    mockResume.mockResolvedValue(undefined);
    openMenu(buildVenue({ ...HIDDEN, ...PAUSED }));
    expect(rows()[1]).toBe(
      `${MENU.resume}|Paused by @hugh, Oct 28: waiting on permission.`,
    );
    fireEvent.click(row('resume'));
    expect(mockResume).toHaveBeenCalledWith('venue-1');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it('Show on site runs at once and refreshes', async () => {
    mockActivate.mockResolvedValue(undefined);
    openMenu(buildVenue(HIDDEN));
    fireEvent.click(row('show'));
    expect(mockActivate).toHaveBeenCalledWith('venue-1');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it('taken down: the info line and Delete only, nothing else', () => {
    openMenu(
      buildVenue({ ...REMOVED, ...PAUSED, deleteBlockers: NO_BLOCKERS }),
    );
    expect(rows()).toEqual([
      `${COPY.takenDown('Nov 2')}|${COPY.takenDownRestore}`,
      `${MENU.delete}|${MENU.deleteHint}`,
    ]);
    for (const key of ['show', 'pause', 'resume', 'take-down', 'flagship'])
      expect(screen.queryByTestId(`venue-menu-${key}`)).toBeNull();
    const info = row('taken-down');
    expect(info.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(info);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockActivate).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('taken down even with `active` set still reads as taken down', () => {
    openMenu(buildVenue({ removedAt: '2026-11-02T18:00:00.000Z' }));
    expect(rows()[0]).toBe(
      `${COPY.takenDown('Nov 2')}|${COPY.takenDownRestore}`,
    );
    expect(screen.queryByTestId('venue-menu-pause')).toBeNull();
  });

  it('taken down with history: Delete is refused', () => {
    openMenu(buildVenue(REMOVED));
    expect(rows()[1]).toBe(
      `${MENU.deleteRefusedLabel}|${CONFIRMS.deleteRefused(65, 235, 12)}`,
    );
    expect(row('delete').getAttribute('aria-disabled')).toBe('true');
  });

  it('hidden with shows or Watchers: Delete is disabled and says why', () => {
    openMenu(buildVenue(HIDDEN));
    expect(rows()[2]).toBe(
      `${MENU.deleteRefusedLabel}|${CONFIRMS.deleteRefused(65, 235, 12)}`,
    );
    expect(row('delete').getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(row('delete'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('never offers Delete on a live venue', () => {
    openMenu(buildVenue({ deleteBlockers: NO_BLOCKERS }));
    expect(screen.queryByTestId('venue-menu-delete')).toBeNull();
  });
});

describe('VenueMenu — each row opens its dialog', () => {
  it('Pause crawling… opens the Pause panel', () => {
    openMenu(buildVenue());
    fireEvent.click(row('pause'));
    expect(
      screen.getByText(ADMIN_COPY.pausePanel.title('Ball Arena')),
    ).toBeTruthy();
  });

  it('Hide from site… opens the Hide confirm; a hide refreshes and closes', async () => {
    mockHide.mockResolvedValue(undefined);
    openMenu(buildVenue());
    fireEvent.click(row('hide'));
    expect(screen.getByText(CONFIRMS.hide.title('Ball Arena'))).toBeTruthy();
    fireEvent.click(
      screen.getByRole('radio', { name: CONFIRMS.hide.reasons.venue_closed }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.hide.confirm }),
    );
    await waitFor(() =>
      expect(mockHide).toHaveBeenCalledWith('venue-1', 'venue_closed', null),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onFailure).toHaveBeenLastCalledWith(null);
  });

  it('Take down… opens the Take down confirm; a take-down leaves for Venues', async () => {
    mockRemove.mockResolvedValue({
      submissionsDeleted: 0,
      eventPricesCleared: 0,
    });
    openMenu(buildVenue());
    fireEvent.click(row('take-down'));
    expect(
      screen.getByText(CONFIRMS.takeDown.title('Ball Arena')),
    ).toBeTruthy();
    typeVenueName('Ball Arena');
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.takeDown.confirm }),
    );
    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith(
        'venue-1',
        CONFIRMS.takeDown.reason,
      ),
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/venues'));
    expect(onFailure).toHaveBeenLastCalledWith(null);
  });

  it('Cancel takes nothing down', () => {
    openMenu(buildVenue());
    fireEvent.click(row('take-down'));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.confirm.cancel }),
    );
    expect(mockRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Delete venue… opens the Delete confirm; a delete goes back to Venues', async () => {
    mockTryDelete.mockResolvedValue({ ok: true, eventsDetached: 2 });
    openMenu(buildVenue({ ...HIDDEN, deleteBlockers: NO_BLOCKERS }));
    fireEvent.click(row('delete'));
    expect(screen.getByText(CONFIRMS.remove.title('Ball Arena'))).toBeTruthy();
    typeVenueName('Ball Arena');
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.remove.confirm }),
    );
    await waitFor(() => expect(mockTryDelete).toHaveBeenCalledWith('venue-1'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/venues'));
  });

  it('a 409 draws the refused Delete row in the menu', async () => {
    // The guard's body as the API sends it, narrowed as the action does.
    const body: unknown = {
      success: false,
      error: 'Venue has history',
      code: 'has_history',
      pastShows: 12,
      upcomingShows: 0,
      watchers: 3,
    };
    mockTryDelete.mockResolvedValue({
      ok: false,
      refused: deleteBlockersOf(body),
    });
    openMenu(buildVenue({ ...HIDDEN, deleteBlockers: NO_BLOCKERS }));
    fireEvent.click(row('delete'));
    typeVenueName('Ball Arena');
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.remove.confirm }),
    );
    const refusal = CONFIRMS.deleteRefused(12, 0, 3);
    expect((await screen.findByRole('alert')).textContent).toBe(refusal);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.confirm.cancel }),
    );
    fireEvent.click(trigger());
    expect(rows()[2]).toBe(`${MENU.deleteRefusedLabel}|${refusal}`);
    expect(row('delete').getAttribute('aria-disabled')).toBe('true');
  });

  it('the refresh after a 409 brings the server’s counts, which win over the 409’s', async () => {
    mockTryDelete.mockResolvedValue({
      ok: false,
      refused: { pastShows: 12, upcomingShows: 0, watchers: 3 },
    });
    const view = render(
      <VenueMenu
        venue={buildVenue({ ...HIDDEN, deleteBlockers: NO_BLOCKERS })}
        onFailure={onFailure}
      />,
    );
    fireEvent.click(trigger());
    fireEvent.click(row('delete'));
    typeVenueName('Ball Arena');
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.remove.confirm }),
    );
    await screen.findByRole('alert');
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.confirm.cancel }),
    );

    // The refreshed payload: one past show now, no Watchers.
    view.rerender(
      <VenueMenu
        venue={buildVenue({
          ...HIDDEN,
          deleteBlockers: { pastShows: 1, upcomingShows: 0, watchers: 0 },
        })}
        onFailure={onFailure}
      />,
    );
    fireEvent.click(trigger());
    expect(rows()[2]).toBe(
      `${MENU.deleteRefusedLabel}|${CONFIRMS.deleteRefused(1, 0, 0)}`,
    );
    fireEvent.click(trigger());

    // And a later refresh with no blockers offers Delete again.
    view.rerender(
      <VenueMenu
        venue={buildVenue({ ...HIDDEN, deleteBlockers: { ...NO_BLOCKERS } })}
        onFailure={onFailure}
      />,
    );
    fireEvent.click(trigger());
    expect(rows()[2]).toBe(`${MENU.delete}|${MENU.deleteHint}`);
  });
});

/** The header's toast, so a test can press its Try again. */
const WithToast = ({ venue }: { venue: VenueWithCrawlHealth }) => {
  const [failure, setFailure] = useState<VenueMenuFailure | null>(null);
  return (
    <>
      <VenueMenu venue={venue} onFailure={setFailure} />
      {failure !== null && (
        <SaveFailedToast
          what={failure.what}
          saved={failure.saved}
          onRetry={failure.retry}
          retrying={failure.retrying}
        />
      )}
    </>
  );
};

describe('VenueMenu — Pause failures (as the old CrawlPauseControl)', () => {
  const PANEL = ADMIN_COPY.pausePanel;
  const openPause = () => {
    render(<WithToast venue={buildVenue()} />);
    fireEvent.click(trigger());
    fireEvent.click(row('pause'));
  };

  it('a pause refreshes and closes the panel', async () => {
    mockPause.mockResolvedValueOnce({ ok: true });
    openPause();
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));
    await waitFor(() =>
      expect(mockPause).toHaveBeenCalledWith('venue-1', {
        reason: 'waiting_on_permission',
        resume: { mode: 'manual' },
      }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByText(PANEL.title('Ball Arena'))).toBeNull();
  });

  it('closes on a failed save, does not refresh, and offers Try again', async () => {
    mockPause.mockResolvedValueOnce({ ok: false, error: null });
    mockPause.mockResolvedValueOnce({ ok: true });
    openPause();
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.queryByText(PANEL.title('Ball Arena'))).toBeNull();
    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    );
    await waitFor(() => expect(mockPause).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('save-failed')).toBeNull());
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('a thrown pause logs and goes to the toast', async () => {
    mockPause.mockRejectedValueOnce(new Error('network'));
    openPause();
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(console.warn).toHaveBeenCalledWith(
      'VenueMenu: pause failed',
      expect.objectContaining({ venueId: 'venue-1' }),
    );
  });

  it('reopens the panel with the refusal inline when Try again is refused', async () => {
    mockPause
      .mockResolvedValueOnce({ ok: false, error: null })
      .mockResolvedValueOnce({ ok: false, error: 'Pick a date after today' });
    openPause();
    fireEvent.click(
      screen.getByRole('radio', { name: PANEL.reasons.site_broken_or_moved }),
    );
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.queryByText(PANEL.title('Ball Arena'))).toBeNull();

    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(PANEL.title('Ball Arena'))).toBeTruthy(),
    );
    // It reopens on the choices that were sent.
    const sent = screen.getByRole('radio', {
      name: PANEL.reasons.site_broken_or_moved,
    });
    expect(sent instanceof HTMLInputElement && sent.checked).toBe(true);
    expect(
      screen.getByText(PANEL.dateError('Pick a date after today')),
    ).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });
});

describe('VenueMenu — immediate changes', () => {
  it('Resume runs at once and refreshes', async () => {
    mockResume.mockResolvedValue(undefined);
    openMenu(buildVenue(PAUSED));
    fireEvent.click(row('resume'));
    expect(mockResume).toHaveBeenCalledWith('venue-1');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(onFailure).toHaveBeenLastCalledWith(null);
  });

  it('a failed flagship change goes to the header toast', async () => {
    mockFeatured.mockRejectedValue(new Error('boom'));
    openMenu(buildVenue());
    fireEvent.click(row('flagship'));
    expect(mockFeatured).toHaveBeenCalledWith('venue-1', true);
    await waitFor(() =>
      expect(onFailure).toHaveBeenLastCalledWith(
        expect.objectContaining({
          what: COPY.failed.flagship,
          saved: COPY.failed.flagshipSaved,
          retrying: false,
        }),
      ),
    );
  });

  it('holds the rows while one runs, so a second press sends nothing', async () => {
    let finish: () => void = () => undefined;
    mockResume.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    openMenu(buildVenue(PAUSED));
    fireEvent.click(row('resume'));
    fireEvent.click(trigger());
    // Every row holds, the dialog rows too.
    for (const key of ['resume', 'flagship', 'hide', 'take-down'])
      expect(row(key).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(row('resume'));
    fireEvent.click(row('flagship'));
    expect(mockResume).toHaveBeenCalledTimes(1);
    expect(mockFeatured).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    await waitFor(() =>
      expect(row('resume').getAttribute('aria-disabled')).toBeNull(),
    );
  });

  it('Try again marks the toast retrying, sends once, and a success clears it', async () => {
    let finish: () => void = () => undefined;
    mockFeatured.mockRejectedValueOnce(new Error('boom'));
    openMenu(buildVenue());
    fireEvent.click(row('flagship'));
    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(1));
    const failed = onFailure.mock.lastCall?.[0];
    if (!failed) throw new Error('no failure reported');
    mockFeatured.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    failed.retry();
    failed.retry();
    expect(mockFeatured).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenLastCalledWith(
      expect.objectContaining({ retrying: true }),
    );
    finish();
    await waitFor(() => expect(onFailure).toHaveBeenLastCalledWith(null));
  });

  it('a confirmed change clears an earlier failure', async () => {
    mockFeatured.mockRejectedValueOnce(new Error('boom'));
    mockHide.mockResolvedValue(undefined);
    openMenu(buildVenue());
    fireEvent.click(row('flagship'));
    await waitFor(() =>
      expect(onFailure).toHaveBeenLastCalledWith(
        expect.objectContaining({ what: COPY.failed.flagship }),
      ),
    );
    fireEvent.click(trigger());
    fireEvent.click(row('hide'));
    fireEvent.click(
      screen.getByRole('radio', {
        name: CONFIRMS.hide.reasons.not_music_venue,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.hide.confirm }),
    );
    await waitFor(() => expect(onFailure).toHaveBeenLastCalledWith(null));
  });
});
