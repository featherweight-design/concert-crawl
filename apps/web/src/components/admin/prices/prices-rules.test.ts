import { describe, expect, it } from 'vitest';
import {
  asHttpUrl,
  dateTile,
  parseDollars,
  shortDate,
  vendorOfUrl,
} from './prices-rules';

describe('dateTile and shortDate', () => {
  it('gives the weekday and day of a show date, not shifted by a zone', () => {
    expect(dateTile('2026-11-12')).toEqual({ weekday: 'THU', day: '12' });
    expect(dateTile('2026-12-01')).toEqual({ weekday: 'TUE', day: '1' });
    expect(shortDate('2026-11-12')).toBe('Thu Nov 12');
  });

  it('refuses a date that is not YYYY-MM-DD', () => {
    expect(dateTile('Nov 12')).toBeNull();
    expect(shortDate('Nov 12')).toBe('Nov 12');
  });
});

describe('vendorOfUrl', () => {
  it('maps a known ticket host to the vendor, with or without a scheme', () => {
    expect(vendorOfUrl('axs.com/events/123')).toBe('AXS');
    expect(vendorOfUrl('https://www.ticketmaster.com/e/1')).toBe(
      'Ticketmaster',
    );
    expect(vendorOfUrl('https://dice.fm/event/x')).toBe('DICE');
    expect(vendorOfUrl('https://www.etix.com/ticket/p/1')).toBe('Etix');
  });

  it('does not match a look-alike host', () => {
    expect(vendorOfUrl('https://notaxs.com/e/1')).toBe('Other');
    expect(vendorOfUrl('https://axs.com.evil.example/e/1')).toBe('Other');
    expect(vendorOfUrl('https://ndice.fm/x')).toBe('Other');
  });

  it('falls back to Other for an unknown host or no address', () => {
    expect(vendorOfUrl('https://example.org/tickets')).toBe('Other');
    expect(vendorOfUrl('not a url')).toBe('Other');
    expect(vendorOfUrl('')).toBe('Other');
  });
});

describe('asHttpUrl', () => {
  it('accepts an address and rejects words and other schemes', () => {
    expect(asHttpUrl('axs.com/x')).toBe('https://axs.com/x');
    expect(asHttpUrl('  ')).toBeNull();
    expect(asHttpUrl('hello')).toBeNull();
    expect(asHttpUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('parseDollars', () => {
  it('reads what an admin types', () => {
    expect(parseDollars('$50')).toBe('50.00');
    expect(parseDollars('1,250.5')).toBe('1250.50');
    expect(parseDollars(' 0 ')).toBe('0.00');
  });

  it('rejects words, negatives and more than two decimals', () => {
    expect(parseDollars('')).toBeNull();
    expect(parseDollars('free')).toBeNull();
    expect(parseDollars('-5')).toBeNull();
    expect(parseDollars('5.555')).toBeNull();
  });
});
