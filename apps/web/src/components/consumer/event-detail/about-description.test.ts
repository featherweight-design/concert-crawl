import { describe, expect, it } from 'vitest';
import { aboutDescription } from './about-description';

describe('aboutDescription', () => {
  it.each([
    ['Canceled', 'cancelled'],
    ['  CANCELLED. ', 'cancelled'],
    ['canceled!', 'cancelled'],
    ['Postponed', 'postponed'],
    ['postponed…', 'postponed'],
  ])('hides %j when status is %s', (value, status) => {
    expect(aboutDescription(value, status)).toBeNull();
  });

  it.each([
    ['Canceled', 'upcoming'],
    ['Canceled', 'postponed'],
    ['Postponed', 'cancelled'],
    ['Sold Out', 'upcoming'],
    ['Sold-out', 'cancelled'],
    ['Rescheduled', 'postponed'],
  ])('keeps %j when status is %s', (value, status) => {
    expect(aboutDescription(value, status)).toBe(value);
  });

  it('hides a missing or blank description', () => {
    expect(aboutDescription(null, 'upcoming')).toBeNull();
    expect(aboutDescription(undefined, 'upcoming')).toBeNull();
    expect(aboutDescription('   ', 'upcoming')).toBeNull();
  });

  it('keeps real prose, even when it mentions the status', () => {
    const text = 'Canceled due to illness. Refunds at point of purchase.';
    expect(aboutDescription(text, 'cancelled')).toBe(text);
  });
});
