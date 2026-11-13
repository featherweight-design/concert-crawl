import { describe, expect, it } from 'vitest';
import {
  PRICES_HREF,
  PRICES_SUBMITTED_HREF,
  RETIRED_REVIEW_TABS,
  REVIEW_TAB_KEYS,
  isRetiredReviewTab,
  isReviewTabKey,
  resolveReviewTab,
  reviewPricesRedirect,
  reviewRedirectsToNeedsYou,
} from './review-tabs';

describe('REVIEW_TAB_KEYS', () => {
  it('keeps only the all-events tab', () => {
    // The price tabs moved to /admin/prices (4d); their URLs redirect.
    expect([...REVIEW_TAB_KEYS]).toEqual(['all-events']);
  });

  it('has no duplicate keys', () => {
    expect(new Set(REVIEW_TAB_KEYS).size).toBe(REVIEW_TAB_KEYS.length);
  });
});

describe('isReviewTabKey', () => {
  it('accepts every canonical key', () => {
    for (const key of REVIEW_TAB_KEYS) {
      expect(isReviewTabKey(key)).toBe(true);
    }
  });

  it('rejects unknown values, the retired price tabs and null', () => {
    expect(isReviewTabKey('price-submissions')).toBe(false);
    expect(isReviewTabKey('prices')).toBe(false);
    expect(isReviewTabKey('submissions')).toBe(false);
    expect(isReviewTabKey('')).toBe(false);
    expect(isReviewTabKey(null)).toBe(false);
  });
});

describe('resolveReviewTab', () => {
  const resolve = (query: string) =>
    resolveReviewTab(new URLSearchParams(query));

  it('reads an explicit ?tab= key', () => {
    expect(resolve('tab=all-events')).toBe('all-events');
  });

  it('falls back to all-events for unknown, retired or absent values', () => {
    expect(resolve('')).toBe('all-events');
    expect(resolve('tab=nonsense')).toBe('all-events');
    expect(resolve('tab=missing')).toBe('all-events');
    expect(resolve('tab=prices')).toBe('all-events');
    expect(resolve('section=submissions')).toBe('all-events');
  });
});

describe('RETIRED_REVIEW_TABS', () => {
  it('retires the three decision tabs that moved to Needs you', () => {
    expect([...RETIRED_REVIEW_TABS]).toEqual([
      'event-flags',
      'missing',
      'contests',
    ]);
  });

  it('never overlaps the live tab keys', () => {
    for (const key of RETIRED_REVIEW_TABS) {
      expect(isReviewTabKey(key)).toBe(false);
      expect((REVIEW_TAB_KEYS as readonly string[]).includes(key)).toBe(false);
    }
  });

  it('is recognised by isRetiredReviewTab and nothing else is', () => {
    for (const key of RETIRED_REVIEW_TABS) {
      expect(isRetiredReviewTab(key)).toBe(true);
    }
    for (const key of REVIEW_TAB_KEYS) {
      expect(isRetiredReviewTab(key)).toBe(false);
    }
    expect(isRetiredReviewTab(null)).toBe(false);
    expect(isRetiredReviewTab(undefined)).toBe(false);
  });
});

describe('reviewPricesRedirect', () => {
  it('sends the price coverage tab to Prices', () => {
    expect(reviewPricesRedirect('prices', null)).toBe(PRICES_HREF);
    expect(PRICES_HREF).toBe('/admin/prices');
  });

  it('sends the submissions tab and the legacy section to Submitted prices', () => {
    expect(PRICES_SUBMITTED_HREF).toBe('/admin/prices?tab=submitted');
    expect(reviewPricesRedirect('submissions', null)).toBe(
      PRICES_SUBMITTED_HREF,
    );
    expect(reviewPricesRedirect(undefined, 'submissions')).toBe(
      PRICES_SUBMITTED_HREF,
    );
    expect(reviewPricesRedirect(null, 'submissions')).toBe(
      PRICES_SUBMITTED_HREF,
    );
  });

  it('prefers an explicit ?tab= over the legacy ?section=', () => {
    expect(reviewPricesRedirect('prices', 'submissions')).toBe(PRICES_HREF);
    expect(reviewPricesRedirect('all-events', 'submissions')).toBeNull();
  });

  it('leaves every other URL alone', () => {
    expect(reviewPricesRedirect('all-events', null)).toBeNull();
    expect(reviewPricesRedirect('event-flags', null)).toBeNull();
    expect(reviewPricesRedirect(undefined, undefined)).toBeNull();
    expect(reviewPricesRedirect(null, 'nonsense')).toBeNull();
  });
});

describe('reviewRedirectsToNeedsYou', () => {
  it('redirects every retired tab', () => {
    for (const key of RETIRED_REVIEW_TABS) {
      expect(reviewRedirectsToNeedsYou(key)).toBe(true);
    }
  });

  it('redirects a missing or unknown tab', () => {
    expect(reviewRedirectsToNeedsYou(undefined)).toBe(true);
    expect(reviewRedirectsToNeedsYou(null)).toBe(true);
    expect(reviewRedirectsToNeedsYou('nonsense')).toBe(true);
  });

  it('keeps every live tab on Review', () => {
    for (const key of REVIEW_TAB_KEYS) {
      expect(reviewRedirectsToNeedsYou(key)).toBe(false);
    }
  });
});
