import { describe, expect, it } from 'vitest';
import { correctMorningTime } from './morning-time-guard.js';

describe('correctMorningTime', () => {
  it('moves a morning hour to the evening when the event shows it only as PM (the Beck listing)', () => {
    const page =
      'Beck: Ride Lonesome Tour. Thursday, Oct 1. Show 7:30 PM. Tickets';
    expect(
      correctMorningTime('07:30:00', page, 'Beck: Ride Lonesome Tour'),
    ).toBe('19:30:00');
    expect(correctMorningTime('7:30', page, 'Beck: Ride Lonesome Tour')).toBe(
      '19:30:00',
    );
  });

  it('reads "7:30pm", "7:30 p.m." and an on-the-hour "7 pm"', () => {
    expect(
      correctMorningTime('07:30:00', 'Beck doors 6, show 7:30pm', 'Beck'),
    ).toBe('19:30:00');
    expect(correctMorningTime('07:30:00', 'Beck show 7:30 p.m.', 'Beck')).toBe(
      '19:30:00',
    );
    expect(
      correctMorningTime('07:00:00', 'Beck show at 7 pm sharp', 'Beck'),
    ).toBe('19:00:00');
  });

  it('leaves a real morning event alone (Yoga on the Rocks at 7:00 AM)', () => {
    expect(
      correctMorningTime(
        '07:00:00',
        'Yoga on the Rocks 7:00 AM',
        'Yoga on the Rocks',
      ),
    ).toBe('07:00:00');
  });

  it('ignores another event on the same page: only the text around this title counts', () => {
    const page =
      'Yoga on the Rocks 07:00 Free. ' +
      'x'.repeat(2000) +
      ' Beck: Ride Lonesome Tour Show 7:00 PM. Tickets';
    expect(correctMorningTime('07:00:00', page, 'Yoga on the Rocks')).toBe(
      '07:00:00',
    );
    expect(
      correctMorningTime('07:00:00', page, 'Beck: Ride Lonesome Tour'),
    ).toBe('19:00:00');
  });

  it('leaves the model answer when the event shows the time as both AM and PM, or neither, or its title is not on the page', () => {
    expect(
      correctMorningTime(
        '07:00:00',
        'Yoga 7:00 AM. Evening show 7:00 PM',
        'Yoga',
      ),
    ).toBe('07:00:00');
    expect(correctMorningTime('07:30:00', 'Beck no times here', 'Beck')).toBe(
      '07:30:00',
    );
    expect(correctMorningTime('07:30:00', 'show 7:30 PM', 'Beck')).toBe(
      '07:30:00',
    );
    expect(correctMorningTime('07:30:00', 'Beck show 7:30 PM', '')).toBe(
      '07:30:00',
    );
  });

  it('does not match a different clock time that merely ends the same way', () => {
    expect(
      correctMorningTime('07:30:00', 'Beck show 17:30 PM and 7:35 PM', 'Beck'),
    ).toBe('07:30:00');
  });

  it('leaves evening, midnight, null and unparseable times alone', () => {
    expect(correctMorningTime('19:30:00', 'Beck 7:30 PM', 'Beck')).toBe(
      '19:30:00',
    );
    expect(correctMorningTime('00:00:00', 'Beck 12:00 PM', 'Beck')).toBe(
      '00:00:00',
    );
    expect(correctMorningTime(null, 'Beck 7:30 PM', 'Beck')).toBeNull();
    expect(correctMorningTime('late', 'Beck 7:30 PM', 'Beck')).toBe('late');
  });
});
