import { describe, expect, it } from 'vitest';
import { crawlTags } from './crawl-tags.js';

describe('crawlTags', () => {
  it('tags the venue and the run when both are known', () => {
    expect(crawlTags('venue-1', 'run-1')).toEqual({
      venueId: 'venue-1',
      crawlRunId: 'run-1',
    });
  });

  it('leaves off whatever is not known', () => {
    expect(crawlTags('venue-1')).toEqual({ venueId: 'venue-1' });
    expect(crawlTags(undefined, 'run-1')).toEqual({ crawlRunId: 'run-1' });
    expect(crawlTags(undefined)).toEqual({});
  });
});
