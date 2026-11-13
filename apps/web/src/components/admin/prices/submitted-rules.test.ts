import { describe, expect, it } from 'vitest';
import {
  backedPill,
  isRejectionReason,
  isSubmissionState,
  priceRange,
} from './submitted-rules';

describe('priceRange', () => {
  it('draws whole dollars without cents and a range with its top', () => {
    expect(priceRange('44.00', '44.00')).toBe('$44');
    expect(priceRange('35.00', '65.00')).toBe('$35–$65');
    expect(priceRange('44.50', '44.50')).toBe('$44.50');
  });

  it('draws a price with no top end with a plus, the one form the boards use', () => {
    expect(priceRange('45.00', null)).toBe('$45+');
    expect(priceRange('45.50', null)).toBe('$45.50+');
    expect(priceRange('0.00', null)).toBe('$0');
  });

  it('draws one price when the top is not above the bottom', () => {
    expect(priceRange('45.00', '45.00')).toBe('$45');
    expect(priceRange('45.00', '40.00')).toBe('$45');
  });
});

describe('backedPill', () => {
  it('is green for two or more fans and amber for one', () => {
    expect(backedPill(2, 'published')).toEqual({ tone: 'green', fans: 2 });
    expect(backedPill(1, 'waiting')).toEqual({ tone: 'amber', fans: 1 });
  });

  it('is red, with no fan count, for a Price check', () => {
    expect(backedPill(3, 'price-check')).toEqual({ tone: 'red', fans: null });
  });
});

describe('guards', () => {
  it('knows the five states and the five reasons', () => {
    expect(isSubmissionState('not-used')).toBe(true);
    expect(isSubmissionState('disputed')).toBe(false);
    expect(isRejectionReason('fees-included')).toBe(true);
    expect(isRejectionReason('because')).toBe(false);
  });
});
