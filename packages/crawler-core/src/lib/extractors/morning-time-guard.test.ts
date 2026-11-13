import { describe, expect, it } from 'vitest';
import { correctMorningTime } from './morning-time-guard.js';

describe('correctMorningTime', () => {
  it('moves a morning hour to the evening when the page shows it only as PM (the Beck listing)', () => {
    const page =
      'Beck: Ride Lonesome Tour. Thursday, Oct 1. Show 7:30 PM. Tickets';
    expect(correctMorningTime('07:30:00', page)).toBe('19:30:00');
    expect(correctMorningTime('7:30', page)).toBe('19:30:00');
  });

  it('reads "7:30pm", "7:30 p.m." and an on-the-hour "7 pm"', () => {
    expect(correctMorningTime('07:30:00', 'doors 6, show 7:30pm')).toBe(
      '19:30:00',
    );
    expect(correctMorningTime('07:30:00', 'show 7:30 p.m.')).toBe('19:30:00');
    expect(correctMorningTime('07:00:00', 'show at 7 pm sharp')).toBe(
      '19:00:00',
    );
  });

  it('leaves a real morning event alone (Yoga on the Rocks at 7:00 AM)', () => {
    expect(correctMorningTime('07:00:00', 'Yoga on the Rocks 7:00 AM')).toBe(
      '07:00:00',
    );
  });

  it('leaves the model answer when the page has the time as both AM and PM, or neither', () => {
    expect(
      correctMorningTime('07:00:00', 'Yoga 7:00 AM. Evening show 7:00 PM'),
    ).toBe('07:00:00');
    expect(correctMorningTime('07:30:00', 'no times here')).toBe('07:30:00');
  });

  it('does not match a different clock time that merely ends the same way', () => {
    expect(correctMorningTime('07:30:00', 'show 17:30 PM and 7:35 PM')).toBe(
      '07:30:00',
    );
  });

  it('leaves evening, midnight, null and unparseable times alone', () => {
    expect(correctMorningTime('19:30:00', 'show 7:30 PM')).toBe('19:30:00');
    expect(correctMorningTime('00:00:00', 'show 12:00 PM')).toBe('00:00:00');
    expect(correctMorningTime(null, 'show 7:30 PM')).toBeNull();
    expect(correctMorningTime('late', 'show 7:30 PM')).toBe('late');
  });
});
