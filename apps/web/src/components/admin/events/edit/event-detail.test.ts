import { describe, expect, it } from 'vitest';
import {
  eventDetailFrom,
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
  mySubmission: { id: 'sub-1', priceMin: '12.00', priceMax: '15.00' },
  extractionStrategy: 'structured_data',
  createdAt: '2026-09-30T18:00:00.000Z',
  lastSeenAt: '2026-11-10T09:00:00.000Z',
  eventUrl: 'https://larimer.example/shows/six-foot-blonde',
  sourceUrl: 'https://larimer.example/calendar',
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
      isSoldOut: false,
      priceMin: '12.00',
      priceMax: null,
      submittedPriceCount: 2,
      priceRetrievedAt: null,
      ticketUrl: null,
      mySubmission: { id: 'sub-1', priceMin: '12.00', priceMax: '15.00' },
      extractionStrategy: 'structured_data',
      firstSeenAt: '2026-09-30T18:00:00.000Z',
      lastSeenAt: '2026-11-10T09:00:00.000Z',
      venueUrl: 'https://larimer.example/shows/six-foot-blonde',
    });
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
});
