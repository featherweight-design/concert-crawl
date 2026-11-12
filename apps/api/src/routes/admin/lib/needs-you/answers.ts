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

export { NAVIGATION_SLUGS } from './answer-kit.js';
export type { AnswerHandler } from './answer-kit.js';

export const ANSWER_HANDLERS: ReadonlyMap<string, AnswerHandler> = new Map(
  [
    stillOn,
    setStatusAnswer('postponed'),
    setStatusAnswer('cancelled'),
    moved,
    moveTo,
    notAConcert,
    itsAShow,
  ].map((handler) => [handler.slug, handler]),
);
