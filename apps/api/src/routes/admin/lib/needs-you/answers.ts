// The Needs you answer table: one row per drawn answer slug, each calling the
// existing domain logic (see the extractions in routes/admin/lib). The handler
// shape and its helpers are in answer-kit.ts; each domain's handlers are in
// its own answers-<domain>.ts.

import type { AnswerHandler } from './answer-kit.js';
import {
  itsAShow,
  moved,
  moveTo,
  notAConcert,
  setStatusAnswer,
  stillOn,
} from './answers-events.js';
import { keepThisMatch, noPhoto, pickRightArtist } from './answers-artists.js';
import {
  approveAll,
  resolveContestAnswer,
  resolveOnly,
} from './answers-prices.js';
import { pauseAnswer, reCrawl } from './answers-venues.js';

export { NAVIGATION_SLUGS } from './answer-kit.js';
export type { AnswerHandler } from './answer-kit.js';

export const ANSWER_HANDLERS: ReadonlyMap<string, AnswerHandler> = new Map(
  [
    stillOn,
    setStatusAnswer('postponed'),
    setStatusAnswer('cancelled'),
    moved,
    moveTo,
    reCrawl('re_crawl_now', 'venue-failing'),
    reCrawl('re_crawl_once', 'venue-blocked'),
    pauseAnswer('keep_paused', 'venue-failing'),
    pauseAnswer('pause_crawling', 'venue-blocked'),
    pickRightArtist,
    keepThisMatch,
    noPhoto,
    notAConcert,
    itsAShow,
    resolveContestAnswer('use_checked_price', 'challenger_wins'),
    resolveContestAnswer('keep_listed_price', 'parent_wins'),
    approveAll,
    resolveOnly,
  ].map((handler) => [handler.slug, handler]),
);
