// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

const mockHide = vi.fn();
const mockRemove = vi.fn();
const mockTryDelete = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  hideVenue: (...args: unknown[]) => mockHide(...args),
  removeVenue: (...args: unknown[]) => mockRemove(...args),
  tryDeleteVenue: (...args: unknown[]) => mockTryDelete(...args),
}));

import { DeleteConfirm, HideConfirm, TakeDownConfirm } from './VenueConfirms';
import { deleteBlockersOf } from './delete-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueConfirms;

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

const onCancel = vi.fn();
const onDone = vi.fn();
const onRefused = vi.fn();

const typeVenueName = (value: string) =>
  fireEvent.change(screen.getByLabelText(COPY.remove.field), {
    target: { value },
  });
const button = (name: string) => screen.getByRole('button', { name });
const isDisabled = (name: string) => button(name).hasAttribute('disabled');

beforeEach(() => {
  vi.stubGlobal('matchMedia', matchMediaStub);
  for (const mock of [
    mockHide,
    mockRemove,
    mockTryDelete,
    onCancel,
    onDone,
    onRefused,
  ])
    mock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HideConfirm', () => {
  const renderHide = (venue = buildVenue()) =>
    render(<HideConfirm venue={venue} onCancel={onCancel} onDone={onDone} />);
  const radio = (key: 'venue_closed' | 'not_music_venue' | 'other') =>
    screen.getByRole('radio', { name: COPY.hide.reasons[key] });

  it('says what goes and holds Hide until a reason is picked', () => {
    renderHide();
    expect(screen.getByText(COPY.hide.title('Ball Arena'))).toBeTruthy();
    expect(
      screen.getByText(COPY.hide.body('Ball Arena', 235, 12)),
    ).toBeTruthy();
    expect(isDisabled(COPY.hide.confirm)).toBe(true);
    fireEvent.click(radio('venue_closed'));
    expect(isDisabled(COPY.hide.confirm)).toBe(false);
  });

  it('drops the counts when the payload has none', () => {
    const bare = buildVenue();
    delete bare.deleteBlockers;
    renderHide(bare);
    const body = COPY.hide.body('Ball Arena', null, null);
    expect(screen.getByText(body)).toBeTruthy();
    expect(body).not.toMatch(/\d/);
  });

  it('Other needs a note before Hide runs, and sends it trimmed', async () => {
    mockHide.mockResolvedValue(undefined);
    renderHide();
    fireEvent.click(radio('other'));
    const note = screen.getByRole('textbox', { name: COPY.hide.noteLabel });
    expect(isDisabled(COPY.hide.confirm)).toBe(true);
    fireEvent.change(note, { target: { value: '   ' } });
    expect(isDisabled(COPY.hide.confirm)).toBe(true);
    fireEvent.change(note, { target: { value: ' Renovation. ' } });
    fireEvent.click(button(COPY.hide.confirm));
    await waitFor(() =>
      expect(mockHide).toHaveBeenCalledWith('venue-1', 'other', 'Renovation.'),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('sends no note for a listed reason', async () => {
    mockHide.mockResolvedValue(undefined);
    renderHide();
    fireEvent.click(radio('not_music_venue'));
    fireEvent.click(button(COPY.hide.confirm));
    await waitFor(() =>
      expect(mockHide).toHaveBeenCalledWith('venue-1', 'not_music_venue', null),
    );
  });

  it('the Why picker is one tab stop that arrow keys walk and pick', () => {
    renderHide();
    expect(radio('venue_closed').tabIndex).toBe(0);
    expect(radio('other').tabIndex).toBe(-1);
    fireEvent.keyDown(radio('venue_closed'), { key: 'ArrowRight' });
    expect(radio('not_music_venue').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio('not_music_venue'));
    expect(radio('venue_closed').tabIndex).toBe(-1);
    fireEvent.keyDown(radio('not_music_venue'), { key: 'ArrowLeft' });
    fireEvent.keyDown(radio('venue_closed'), { key: 'ArrowUp' });
    expect(radio('other').getAttribute('aria-checked')).toBe('true');
    expect(radio('other').tabIndex).toBe(0);
  });

  it('a failure stays in the dialog and says so', async () => {
    mockHide.mockRejectedValue(new Error('boom'));
    renderHide();
    fireEvent.click(radio('venue_closed'));
    fireEvent.click(button(COPY.hide.confirm));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(COPY.failed.hideSaved);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('TakeDownConfirm', () => {
  const renderTakeDown = () =>
    render(
      <TakeDownConfirm
        venue={buildVenue()}
        onCancel={onCancel}
        onDone={onDone}
      />,
    );

  it('says what goes, with the upcoming count, and holds until the name is typed', async () => {
    mockRemove.mockResolvedValue({
      submissionsDeleted: 0,
      eventPricesCleared: 0,
    });
    renderTakeDown();
    expect(screen.getByText(COPY.takeDown.title('Ball Arena'))).toBeTruthy();
    expect(
      screen.getByText(COPY.takeDown.body('Ball Arena', 235)),
    ).toBeTruthy();
    expect(screen.getByText(COPY.takeDown.warn)).toBeTruthy();
    expect(isDisabled(COPY.takeDown.confirm)).toBe(true);
    fireEvent.click(button(COPY.takeDown.confirm));
    typeVenueName('Ball');
    expect(isDisabled(COPY.takeDown.confirm)).toBe(true);
    typeVenueName('Ball Arena');
    expect(mockRemove).not.toHaveBeenCalled();
    fireEvent.click(button(COPY.takeDown.confirm));
    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith('venue-1', COPY.takeDown.reason),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('appends the note to the audit reason', async () => {
    mockRemove.mockResolvedValue({
      submissionsDeleted: 0,
      eventPricesCleared: 0,
    });
    renderTakeDown();
    fireEvent.change(
      screen.getByRole('textbox', { name: COPY.takeDown.noteLabel }),
      { target: { value: '  Booker emailed venues@ on Nov 2  ' } },
    );
    typeVenueName('Ball Arena');
    fireEvent.click(button(COPY.takeDown.confirm));
    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith(
        'venue-1',
        `${COPY.takeDown.reason}: Booker emailed venues@ on Nov 2`,
      ),
    );
  });

  it('Cancel takes nothing down', () => {
    renderTakeDown();
    fireEvent.click(button(ADMIN_COPY.confirm.cancel));
    expect(onCancel).toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });
});

describe('DeleteConfirm', () => {
  const renderDelete = () =>
    render(
      <DeleteConfirm
        venue={buildVenue({
          active: false,
          deleteBlockers: { pastShows: 0, upcomingShows: 0, watchers: 0 },
        })}
        onCancel={onCancel}
        onDone={onDone}
        onRefused={onRefused}
      />,
    );

  it('holds Delete until the venue’s name is typed', async () => {
    mockTryDelete.mockResolvedValue({ ok: true });
    renderDelete();
    expect(isDisabled(COPY.remove.confirm)).toBe(true);
    typeVenueName('Ball');
    expect(isDisabled(COPY.remove.confirm)).toBe(true);
    typeVenueName('Ball Arena');
    expect(isDisabled(COPY.remove.confirm)).toBe(false);
    fireEvent.click(button(COPY.remove.confirm));
    await waitFor(() => expect(mockTryDelete).toHaveBeenCalledWith('venue-1'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('a 409 body shows the refusal in the dialog and hands on its counts', async () => {
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
    renderDelete();
    typeVenueName('Ball Arena');
    fireEvent.click(button(COPY.remove.confirm));
    expect((await screen.findByRole('alert')).textContent).toBe(
      COPY.deleteRefused(12, 0, 3),
    );
    expect(isDisabled(COPY.remove.confirm)).toBe(true);
    expect(onRefused).toHaveBeenCalledWith({
      pastShows: 12,
      upcomingShows: 0,
      watchers: 3,
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('any other failure says so inside the dialog', async () => {
    mockTryDelete.mockResolvedValue({ ok: false, refused: null });
    renderDelete();
    typeVenueName('Ball Arena');
    fireEvent.click(button(COPY.remove.confirm));
    expect((await screen.findByRole('alert')).textContent).toContain(
      COPY.failed.deleteSaved,
    );
    expect(onRefused).not.toHaveBeenCalled();
  });
});

describe('the refused line', () => {
  it('counts all shows when some are upcoming, and drops a zero Watchers clause', () => {
    expect(COPY.deleteRefused(12, 0, 3)).toBe(
      'Can’t delete: it has 12 past shows and 3 people Watching them. It stays hidden instead.',
    );
    expect(COPY.deleteRefused(1, 2, 0)).toBe(
      'Can’t delete: it has 3 shows. It stays hidden instead.',
    );
  });
});
