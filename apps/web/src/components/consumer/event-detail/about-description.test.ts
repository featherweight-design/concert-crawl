import { describe, expect, it } from 'vitest';
import { aboutDescription } from './about-description';

describe('aboutDescription', () => {
  it.each([
    'Canceled',
    'cancelled',
    '  POSTPONED ',
    'Sold Out',
    'rescheduled',
    '   ',
    '',
  ])('hides a status-only description %j', (value) => {
    expect(aboutDescription(value)).toBeNull();
  });

  it('hides a missing description', () => {
    expect(aboutDescription(null)).toBeNull();
    expect(aboutDescription(undefined)).toBeNull();
  });

  it('keeps real prose, even when it mentions a status', () => {
    const text = 'Canceled due to illness. Refunds at point of purchase.';
    expect(aboutDescription(text)).toBe(text);
  });
});
