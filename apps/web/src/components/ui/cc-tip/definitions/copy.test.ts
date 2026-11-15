import { describe, expect, it } from 'vitest';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

import { TIP_CONTENT } from './copy';

// Concert Crawl is free. Copy a fan reads on every upcoming show, or before
// signing up, must never claim a price or a plan.
const PRICE_WORDS = /paid|premium|supporter|plan|trial|upgrade/i;

describe('free-app copy', () => {
  it('explains Going vs. Watching without a price or a plan', () => {
    const tip = TIP_CONTENT['going-vs-watch'];
    if (tip.variant !== 'defs') throw new Error('expected the defs panel');
    const strings = [
      tip.label,
      tip.intro,
      ...tip.rows.flatMap((row) => [row.title, row.body]),
    ];
    for (const text of strings) expect(text).not.toMatch(PRICE_WORDS);
  });

  it('sells signed-out Watching without a tier or a trial', () => {
    for (const fact of CONSUMER_COPY.watching.signedOut.facts) {
      expect(fact.title).not.toMatch(PRICE_WORDS);
      expect(fact.body).not.toMatch(PRICE_WORDS);
    }
  });
});
