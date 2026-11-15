import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { EventDetail } from './event-detail';
import { moveTellsWatchers, venueEditable, venueRefusalOf } from './venue-move';

const COPY = ADMIN_COPY.eventEdit.venue;
const TODAY = '2026-11-13';
const UPCOMING = '2026-11-14';
const PLAYED = '2026-11-01';

const DETAIL: EventDetail = {
  id: 'evt-1',
  title: 'Six Foot Blonde',
  artist: 'Six Foot Blonde',
  date: UPCOMING,
  doorsTime: null,
  showTime: '19:00:00',
  venueId: 'ven-larimer',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  status: 'available',
  hidden: false,
  hiddenReason: null,
  watchingCount: 4,
  wentCount: null,
  isSoldOut: false,
  priceMin: null,
  priceMax: null,
  submittedPriceCount: 0,
  priceRetrievedAt: null,
  ticketUrl: null,
  mySubmission: null,
  extractionStrategy: 'structured_data',
  firstSeenAt: '2026-09-30T18:00:00.000Z',
  lastSeenAt: null,
  delistedAt: null,
  venueUrl: null,
  tourName: null,
  soldOutRecord: null,
  lineup: [],
  manual: false,
  moved: null,
};

describe('venueEditable', () => {
  it('takes a move on a show added by hand, upcoming or past', () => {
    expect(venueEditable({ ...DETAIL, manual: true }, TODAY)).toBe(true);
    expect(
      venueEditable({ ...DETAIL, manual: true, date: PLAYED }, TODAY),
    ).toBe(true);
  });

  it('refuses a crawled show still to come, and a crawled postponed one whatever its date', () => {
    expect(venueEditable(DETAIL, TODAY)).toBe(false);
    expect(venueEditable({ ...DETAIL, status: 'postponed' }, TODAY)).toBe(
      false,
    );
    expect(
      venueEditable({ ...DETAIL, status: 'postponed', date: PLAYED }, TODAY),
    ).toBe(false);
  });

  it('takes a correction on a crawled show that played', () => {
    expect(
      venueEditable({ ...DETAIL, status: 'played', date: PLAYED }, TODAY),
    ).toBe(true);
  });

  it('lets a show added by hand whose venue was removed get one', () => {
    expect(
      venueEditable(
        {
          ...DETAIL,
          manual: true,
          venueId: null,
          venueName: null,
          venueSlug: null,
        },
        TODAY,
      ),
    ).toBe(true);
  });
});

describe('moveTellsWatchers', () => {
  const asSaved = { date: UPCOMING, reopened: false };

  it('tells the Watching of a show still to come', () => {
    expect(moveTellsWatchers(DETAIL, TODAY, asSaved)).toBe(true);
  });

  it('tells nobody with nobody Watching, or on a cancelled show', () => {
    expect(
      moveTellsWatchers({ ...DETAIL, watchingCount: 0 }, TODAY, asSaved),
    ).toBe(false);
    expect(
      moveTellsWatchers({ ...DETAIL, status: 'cancelled' }, TODAY, asSaved),
    ).toBe(false);
  });

  it('corrects a played show silently', () => {
    expect(
      moveTellsWatchers({ ...DETAIL, status: 'played', date: PLAYED }, TODAY, {
        date: PLAYED,
        reopened: false,
      }),
    ).toBe(false);
  });

  it('tells the Watching of a postponed show whatever its date', () => {
    expect(
      moveTellsWatchers(
        { ...DETAIL, status: 'postponed', date: PLAYED },
        TODAY,
        { date: PLAYED, reopened: false },
      ),
    ).toBe(true);
  });

  it('reads the show after the same Save’s PATCH', () => {
    // A cancelled show put back on sale in the same Save: the move tells.
    expect(
      moveTellsWatchers({ ...DETAIL, status: 'cancelled' }, TODAY, {
        date: UPCOMING,
        reopened: true,
      }),
    ).toBe(true);
    // A show dated into the past in the same Save: a silent correction.
    expect(
      moveTellsWatchers(DETAIL, TODAY, { date: PLAYED, reopened: false }),
    ).toBe(false);
    // A passed postponed show put back on with a past date: a correction.
    expect(
      moveTellsWatchers(
        { ...DETAIL, status: 'postponed', date: PLAYED },
        TODAY,
        { date: PLAYED, reopened: true },
      ),
    ).toBe(false);
  });
});

describe('venueRefusalOf', () => {
  const duplicate = (body: unknown) =>
    new ApiError(
      409,
      'duplicate_show',
      undefined,
      undefined,
      undefined,
      undefined,
      body,
    );

  it('names duplicate_show with the other listing', () => {
    expect(
      venueRefusalOf(
        duplicate({
          success: false,
          error: 'duplicate_show',
          existingId: 'evt-9',
        }),
      ),
    ).toEqual({ message: COPY.duplicate, existingId: 'evt-9' });
  });

  it('names a duplicate_show with no usable existingId, with no link', () => {
    expect(venueRefusalOf(duplicate({ success: false }))).toEqual({
      message: COPY.duplicate,
      existingId: null,
    });
    expect(venueRefusalOf(duplicate({ existingId: 7 }))).toEqual({
      message: COPY.duplicate,
      existingId: null,
    });
    expect(venueRefusalOf(duplicate(undefined))).toEqual({
      message: COPY.duplicate,
      existingId: null,
    });
  });

  it('names crawled_show and venue_not_found', () => {
    expect(venueRefusalOf(new ApiError(409, 'crawled_show'))).toEqual({
      message: COPY.crawled,
      existingId: null,
    });
    expect(venueRefusalOf(new ApiError(400, 'venue_not_found'))).toEqual({
      message: COPY.notFound,
      existingId: null,
    });
  });

  it('leaves any other failure to the caller', () => {
    expect(venueRefusalOf(new ApiError(409, 'past_locked'))).toBeNull();
    expect(venueRefusalOf(new ApiError(400, 'venue_required'))).toBeNull();
    expect(venueRefusalOf(new ApiError(400, 'crawled_show'))).toBeNull();
    expect(venueRefusalOf(new ApiError(409, 'venue_not_found'))).toBeNull();
    expect(venueRefusalOf(new ApiError(500, 'duplicate_show'))).toBeNull();
    expect(venueRefusalOf(new Error('duplicate_show'))).toBeNull();
  });
});
