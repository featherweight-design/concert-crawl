import { describe, expect, it } from 'vitest';
import { AUDIT_ACTION_KEYS } from '@concert-crawl/types';
import {
  actionsMatching,
  MAX_SEARCH_ACTIONS,
  SEARCH_MAX_LENGTH,
} from './log-search';

describe('actionsMatching (Search the log)', () => {
  it('matches nothing for a blank search', () => {
    expect(actionsMatching('')).toEqual([]);
    expect(actionsMatching('   ')).toEqual([]);
    expect(actionsMatching('@')).toEqual([]);
  });

  it('finds a fixed sentence by a word in it, any case', () => {
    expect(actionsMatching('Resumed CRAWLING')).toEqual(
      expect.arrayContaining([
        'venue.crawl_resume',
        'venue.crawl_auto_resumed',
      ]),
    );
    expect(actionsMatching('blocking')).toEqual(['venue.crawl_blocked']);
  });

  it('needs every word, in any order', () => {
    const both = actionsMatching('crawling after');
    expect(both).toContain('venue.crawl_auto_paused');
    expect(both).not.toContain('venue.crawl_resume');
    expect(actionsMatching('after crawling')).toEqual(both);
  });

  it('finds every wording of a variant sentence', () => {
    expect(actionsMatching('untagged')).toEqual(['user.test_account.set']);
    expect(actionsMatching('as a test account')).toContain(
      'user.test_account.set',
    );
    expect(actionsMatching('llm budget')).toContain('settings.update');
    expect(actionsMatching('approve every price myself off')).toEqual(
      expect.arrayContaining(['price.settings.update', 'settings.update']),
    );
  });

  it('drops a leading @, as the API does', () => {
    expect(actionsMatching('@blocking')).toEqual(['venue.crawl_blocked']);
  });

  it('sends only keys the API accepts, at most its cap', () => {
    const keys = actionsMatching('e');
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(MAX_SEARCH_ACTIONS);
    for (const key of keys) expect(AUDIT_ACTION_KEYS).toContain(key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('caps the search at the API limit', () => {
    expect(SEARCH_MAX_LENGTH).toBe(100);
  });

  it('matches nothing for words no sentence has', () => {
    expect(actionsMatching('zzqx')).toEqual([]);
  });
});
