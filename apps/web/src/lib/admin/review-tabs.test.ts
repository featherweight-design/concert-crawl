import { describe, expect, it } from 'vitest';
import {
  RETIRED_REVIEW_TABS,
  REVIEW_TAB_KEYS,
  isRetiredReviewTab,
  isReviewTabKey,
  resolveReviewTab,
  reviewRedirectsToNeedsYou,
} from './review-tabs';

describe('REVIEW_TAB_KEYS', () => {
  it('carries submissions and prices as separate tabs', () => {
    // The split (#1610): `prices` keeps its key and now holds price coverage
    // only, `submissions` is additive. Keeping `prices` is what preserves
    // existing `?tab=prices` links and `?from=prices` editor round-trips.
    expect(REVIEW_TAB_KEYS).toContain('prices');
    expect(REVIEW_TAB_KEYS).toContain('submissions');
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

  it('rejects unknown values and null', () => {
    expect(isReviewTabKey('price-submissions')).toBe(false);
    expect(isReviewTabKey('')).toBe(false);
    expect(isReviewTabKey(null)).toBe(false);
  });
});

describe('resolveReviewTab', () => {
  const resolve = (query: string) =>
    resolveReviewTab(new URLSearchParams(query));

  it('reads an explicit ?tab= key', () => {
    expect(resolve('tab=submissions')).toBe('submissions');
    expect(resolve('tab=prices')).toBe('prices');
    expect(resolve('tab=all-events')).toBe('all-events');
  });

  it('maps the legacy ?section=submissions onto the submissions tab', () => {
    // Before the split this landed on `prices`, which then had to smooth-scroll
    // to a `#submissions-section` anchor. The tab now IS that surface, so the
    // legacy URL keeps working and lands somewhere more accurate.
    expect(resolve('section=submissions')).toBe('submissions');
  });

  it('prefers an explicit ?tab= over the legacy ?section=', () => {
    expect(resolve('tab=prices&section=submissions')).toBe('prices');
  });

  it('falls back to prices for unknown, retired or absent values', () => {
    expect(resolve('')).toBe('prices');
    expect(resolve('tab=nonsense')).toBe('prices');
    expect(resolve('tab=missing')).toBe('prices');
    expect(resolve('section=nonsense')).toBe('prices');
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

describe('reviewRedirectsToNeedsYou', () => {
  it('redirects every retired tab, with or without ?section=', () => {
    for (const key of RETIRED_REVIEW_TABS) {
      expect(reviewRedirectsToNeedsYou(key, null)).toBe(true);
      expect(reviewRedirectsToNeedsYou(key, 'submissions')).toBe(true);
    }
  });

  it('redirects a missing or unknown tab', () => {
    expect(reviewRedirectsToNeedsYou(undefined, undefined)).toBe(true);
    expect(reviewRedirectsToNeedsYou(null, null)).toBe(true);
    expect(reviewRedirectsToNeedsYou('nonsense', null)).toBe(true);
  });

  it('keeps every live tab on Review', () => {
    for (const key of REVIEW_TAB_KEYS) {
      expect(reviewRedirectsToNeedsYou(key, null)).toBe(false);
    }
  });

  it('keeps the legacy ?section=submissions on Review', () => {
    expect(reviewRedirectsToNeedsYou(undefined, 'submissions')).toBe(false);
    expect(reviewRedirectsToNeedsYou(null, 'submissions')).toBe(false);
  });
});
