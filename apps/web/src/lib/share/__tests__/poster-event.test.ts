import { describe, expect, it } from 'vitest';
import {
  posterStateFor,
  toPosterEvent,
  type PosterSource,
} from '@/lib/share/poster-event';

const source: PosterSource = {
  id: '11111111-2222-4333-8444-555555555555',
  artist: 'Snakebite Revival',
  date: '2026-03-14',
  showTime: '20:00',
  venue: {
    name: 'Bluebird Theater',
    city: 'Denver',
    timezone: 'America/Denver',
  },
  priceStatus: 'live',
};

describe('posterStateFor', () => {
  it('defaults to going', () => {
    expect(posterStateFor(source)).toBe('going');
  });

  it('reads sold out from the price status', () => {
    expect(posterStateFor({ ...source, priceStatus: 'soldout' })).toBe(
      'soldout',
    );
  });
});

describe('toPosterEvent', () => {
  it('maps an event onto the poster model', () => {
    const poster = toPosterEvent(source);
    expect(poster.artist).toBe('Snakebite Revival');
    expect(poster.venue).toBe('Bluebird Theater');
    expect(poster.city).toBe('Denver');
    expect(poster.state).toBe('going');
  });

  it('sets the date stamp in caps, in the venue timezone', () => {
    expect(toPosterEvent(source).dateShort).toBe('SAT, MAR 14');
  });

  it('carries a null show time through rather than inventing one', () => {
    expect(toPosterEvent({ ...source, showTime: null }).showTime).toBeNull();
  });
});
