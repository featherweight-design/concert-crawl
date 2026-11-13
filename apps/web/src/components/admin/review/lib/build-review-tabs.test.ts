import { describe, expect, it } from 'vitest';
import { buildReviewTabs } from './build-review-tabs';
import { RETIRED_REVIEW_TABS, REVIEW_TAB_KEYS } from '@/lib/admin/review-tabs';

describe('buildReviewTabs', () => {
  it('emits one descriptor per canonical tab key, in canonical order', () => {
    expect(buildReviewTabs().map((tab) => tab.key)).toEqual([
      ...REVIEW_TAB_KEYS,
    ]);
  });

  it('renders no tab for a retired key', () => {
    const rendered = buildReviewTabs().map((tab) => tab.key);
    for (const key of RETIRED_REVIEW_TABS) {
      expect(rendered).not.toContain(key);
    }
  });

  it('renders no price tab and no counts', () => {
    const tabs = buildReviewTabs();
    expect(tabs.map((tab) => tab.key)).not.toContain('prices');
    expect(tabs.map((tab) => tab.key)).not.toContain('submissions');
    expect(tabs.every((tab) => tab.count === undefined)).toBe(true);
  });
});
