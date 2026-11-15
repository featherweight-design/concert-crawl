import { describe, expect, it } from 'vitest';
import {
  dayBefore,
  eventDetailFrom,
  isPostponedPassed,
  fieldDate,
  fieldTime,
  isPast,
  type EventDetail,
} from './event-detail';

const PAYLOAD = {
  id: 'evt-1',
  title: 'Six Foot Blonde w/ The Man is Dead',
  artist: 'Six Foot Blonde',
  date: '2026-11-14',
  doorsTime: '18:00:00',
  showTime: '19:00:00',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  listStatus: 'available',
  hiddenFromConsumer: false,
  hiddenReason: null,
  watchingCount: 4,
  isSoldOut: false,
  ticketPriceMin: '12.00',
  ticketPriceMax: null,
  submittedPriceCount: 2,
  priceRetrievedAt: null,
  ticketUrl: null,
  mySubmission: {
    id: 'sub-1',
    priceMin: '12.00',
    priceMax: '15.00',
    status: 'pending',
  },
  extractionStrategy: 'structured_data',
  createdAt: '2026-09-30T18:00:00.000Z',
  lastSeenAt: '2026-11-10T09:00:00.000Z',
  eventUrl: 'https://larimer.example/shows/six-foot-blonde',
  sourceUrl: 'https://larimer.example/calendar',
  tourName: null,
  soldOutRecord: null,
};

const RECORD = {
  reporter: {
    handle: 'mira.k',
    avatarColor: 'signal',
    avatarSecondColor: 'accent',
    kind: 'fan',
  },
  evidenceMethod: 'bought_myself',
  evidenceUrl: 'https://axs.com/events/52114',
  note: 'Friday GA gone; pit waitlist still open.',
  reportedAt: '2026-11-10T02:15:00.000Z',
  madeLiveAt: '2026-11-10T04:02:00.000Z',
  confirmsCount: 2,
};

describe('eventDetailFrom', () => {
  it('reads the fields Event edit draws', () => {
    expect(eventDetailFrom(PAYLOAD)).toEqual<EventDetail>({
      id: 'evt-1',
      title: 'Six Foot Blonde w/ The Man is Dead',
      artist: 'Six Foot Blonde',
      date: '2026-11-14',
      doorsTime: '18:00:00',
      showTime: '19:00:00',
      venueName: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
      status: 'available',
      hidden: false,
      hiddenReason: null,
      watchingCount: 4,
      wentCount: null,
      isSoldOut: false,
      priceMin: '12.00',
      priceMax: null,
      submittedPriceCount: 2,
      priceRetrievedAt: null,
      ticketUrl: null,
      mySubmission: {
        id: 'sub-1',
        priceMin: '12.00',
        priceMax: '15.00',
        status: 'pending',
      },
      extractionStrategy: 'structured_data',
      firstSeenAt: '2026-09-30T18:00:00.000Z',
      lastSeenAt: '2026-11-10T09:00:00.000Z',
      delistedAt: null,
      venueUrl: 'https://larimer.example/shows/six-foot-blonde',
      tourName: null,
      soldOutRecord: null,
    });
  });

  it('reads the tour name, and refuses one that drifted (a save would clear it)', () => {
    expect(
      eventDetailFrom({ ...PAYLOAD, tourName: 'Jubilee Tour' })?.tourName,
    ).toBe('Jubilee Tour');
    expect(eventDetailFrom({ ...PAYLOAD, tourName: 7 })).toBeNull();
  });

  it('reads the sold-out record, and none for one that drifted', () => {
    expect(
      eventDetailFrom({ ...PAYLOAD, isSoldOut: true, soldOutRecord: RECORD })
        ?.soldOutRecord,
    ).toEqual(RECORD);
    expect(
      eventDetailFrom({
        ...PAYLOAD,
        isSoldOut: true,
        soldOutRecord: { ...RECORD, evidenceMethod: 'guessed' },
      })?.soldOutRecord,
    ).toBeNull();
    expect(
      eventDetailFrom({
        ...PAYLOAD,
        soldOutRecord: {
          ...RECORD,
          reporter: { ...RECORD.reporter, kind: 'beta' },
        },
      })?.soldOutRecord,
    ).toBeNull();
    const older: Record<string, unknown> = { ...PAYLOAD };
    delete older['soldOutRecord'];
    expect(eventDetailFrom(older)?.soldOutRecord).toBeNull();
  });

  it('falls back to the calendar, and to no link when neither URL is safe', () => {
    expect(eventDetailFrom({ ...PAYLOAD, eventUrl: null })?.venueUrl).toBe(
      'https://larimer.example/calendar',
    );
    expect(
      eventDetailFrom({
        ...PAYLOAD,
        eventUrl: 'javascript:alert(1)',
        sourceUrl: 'data:text/html,x',
      })?.venueUrl,
    ).toBeNull();
  });

  it('reads an API without eventUrl as the calendar link, not a failure', () => {
    const older: Record<string, unknown> = { ...PAYLOAD };
    delete older['eventUrl'];
    expect(eventDetailFrom(older)?.venueUrl).toBe(
      'https://larimer.example/calendar',
    );
  });

  it('reads the Price card extras leniently', () => {
    const lean: Record<string, unknown> = {
      ...PAYLOAD,
      ticketPriceMin: 12,
      mySubmission: { id: 'sub-1', priceMin: 'x' },
    };
    delete lean['submittedPriceCount'];
    delete lean['priceRetrievedAt'];
    delete lean['ticketUrl'];
    expect(eventDetailFrom(lean)).toMatchObject({
      priceMin: '12',
      submittedPriceCount: 0,
      priceRetrievedAt: null,
      ticketUrl: null,
      mySubmission: null,
    });
  });

  it('refuses a payload that drifted', () => {
    expect(eventDetailFrom({ ...PAYLOAD, listStatus: 'gone' })).toBeNull();
    expect(eventDetailFrom({ ...PAYLOAD, watchingCount: '4' })).toBeNull();
    expect(eventDetailFrom(null)).toBeNull();
  });
});

describe('field formats', () => {
  it('draws times as the board does', () => {
    expect(fieldTime('18:00:00')).toBe('6:00 PM');
    expect(fieldTime('00:30:00')).toBe('12:30 AM');
    expect(fieldTime('12:05:00')).toBe('12:05 PM');
    expect(fieldTime(null)).toBeNull();
    expect(fieldTime('25:00:00')).toBeNull();
  });

  it('draws the date with the year on desktop only', () => {
    expect(fieldDate('2026-11-14', true)).toBe('Sat, Nov 14, 2026');
    expect(fieldDate('2026-11-14', false)).toBe('Sat, Nov 14');
  });

  it('calls a show dated before today past', () => {
    const detail = eventDetailFrom(PAYLOAD);
    if (detail === null) throw new Error('fixture');
    expect(isPast(detail, '2026-11-15')).toBe(true);
    expect(isPast(detail, '2026-11-14')).toBe(false);
  });

  it('keeps a postponed show whose date passed apart from a played one', () => {
    const detail = eventDetailFrom({ ...PAYLOAD, listStatus: 'postponed' });
    if (detail === null) throw new Error('fixture');
    expect(isPostponedPassed(detail, '2026-11-15')).toBe(true);
    expect(isPostponedPassed(detail, '2026-11-14')).toBe(false);
    expect(
      isPostponedPassed({ ...detail, status: 'played' }, '2026-11-15'),
    ).toBe(false);
  });

  it('steps back a day across a month and a year', () => {
    expect(dayBefore('2026-12-01')).toBe('2026-11-30');
    expect(dayBefore('2027-01-01')).toBe('2026-12-31');
  });

  it('reads the went count, and none when it is missing', () => {
    expect(eventDetailFrom({ ...PAYLOAD, wentCount: 18 })?.wentCount).toBe(18);
    expect(eventDetailFrom(PAYLOAD)?.wentCount).toBeNull();
  });
});
