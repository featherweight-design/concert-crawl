// Needs you answers: failing and blocked venues. See answer-kit.ts for the handler shape.

import type { NeedsYouKind } from '@concert-crawl/types';
import { queueVenueCrawl } from '../crawl-trigger.js';
import {
  pauseBodySchema,
  pauseVenueCrawl,
  resolvePauseDetails,
} from '../venue-crawl-pause.js';
import { VENUE_REMOVED_CODE, VENUE_REMOVED_ERROR } from '../venue-hide.js';
import { define, fail, noParams } from './answer-kit.js';

export const reCrawl = (
  slug: 're_crawl_now' | 're_crawl_once',
  kind: NeedsYouKind,
) =>
  define({
    slug,
    kinds: [kind],
    schema: noParams,
    run: async (item, _params, actorId) => {
      if (item.venueId === null) return fail(422, 'This item has no venue');
      const queued = await queueVenueCrawl(item.venueId, actorId, false);
      switch (queued.ok) {
        case 'queued':
          return {
            ok: true,
            params: {},
            before: null,
            result: { triggerId: queued.triggerId },
          };
        case 'not_found':
          return fail(404, 'Venue not found');
        case 'removed':
          return fail(409, VENUE_REMOVED_ERROR, VENUE_REMOVED_CODE);
        case 'not_crawlable':
          return fail(422, 'Venue must be active and verified to crawl');
        case 'paused':
          return fail(409, 'Crawling is paused for this venue');
        case 'robots_disallowed':
          return fail(409, 'robots.txt disallows crawling this venue');
        case 'failed':
          return fail(500, 'Failed to create crawl trigger');
      }
    },
  });

export const pauseAnswer = (
  slug: 'keep_paused' | 'pause_crawling',
  kind: NeedsYouKind,
) =>
  define({
    slug,
    kinds: [kind],
    schema: pauseBodySchema,
    run: async (item, params, actorId) => {
      if (item.venueId === null) return fail(422, 'This item has no venue');
      const resolved = resolvePauseDetails(params, new Date());
      if (!resolved.ok) return fail(422, resolved.error);
      const paused = await pauseVenueCrawl(
        item.venueId,
        resolved.details,
        actorId,
      );
      if (!paused) return fail(404, 'Venue not found');
      return {
        ok: true,
        params: { ...resolved.details },
        before: null,
        result: { alreadyPaused: paused.existing.crawlPausedAt !== null },
      };
    },
  });
