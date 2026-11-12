// GET /v1/admin/crawl/pages/:id/body — the stored HTML of one fetched page, for
// the admin Inspect viewer (redesign 1e). Bodies are only kept while the
// crawler runs with CRAWL_PAGE_BODIES=on, gzipped, until the daily sweep drops
// them after 14 days. The body is returned as a JSON string, never as a
// document, so it cannot run in the admin's origin.

import { gunzipSync } from 'node:zlib';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { crawlRunPages, db } from '@concert-crawl/db';
import { idSchema } from '../../lib/id-schema.js';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';

const pageIdSchema = z.object({ id: idSchema });

// The crawler never stores more than 2 MB, so a body that inflates past this
// is not ours; refuse rather than hold it in memory.
const MAX_INFLATED_BYTES = 4 * 1024 * 1024;

export const crawlPagesAdminRouter = new Hono<AdminVariables>();

crawlPagesAdminRouter.get(
  '/pages/:id/body',
  zValidator('param', pageIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const [page] = await db
      .select({
        id: crawlRunPages.id,
        crawlRunId: crawlRunPages.crawlRunId,
        url: crawlRunPages.url,
        finalUrl: crawlRunPages.finalUrl,
        httpStatus: crawlRunPages.httpStatus,
        bytes: crawlRunPages.bytes,
        fetchedAt: crawlRunPages.fetchedAt,
        htmlGz: crawlRunPages.htmlGz,
        bodyExpiresAt: crawlRunPages.bodyExpiresAt,
        bodyTruncated: crawlRunPages.bodyTruncated,
      })
      .from(crawlRunPages)
      .where(eq(crawlRunPages.id, id));
    if (!page) {
      return ctx.json({ success: false, error: 'Page not found' }, 404);
    }

    if (page.htmlGz === null) {
      // Why there is no body, so the viewer can say so.
      const reason = page.bodyTruncated
        ? 'too_large'
        : page.bodyExpiresAt !== null
          ? 'expired'
          : 'not_stored';
      return ctx.json(
        { success: false, error: 'No stored body for this page', reason },
        404,
      );
    }

    let html: string;
    try {
      html = gunzipSync(page.htmlGz, {
        maxOutputLength: MAX_INFLATED_BYTES,
      }).toString('utf8');
    } catch {
      return ctx.json(
        { success: false, error: 'The stored body is unreadable' },
        500,
      );
    }

    return ctx.json({
      success: true,
      data: {
        id: page.id,
        crawlRunId: page.crawlRunId,
        url: page.url,
        finalUrl: page.finalUrl,
        httpStatus: page.httpStatus,
        bytes: page.bytes,
        fetchedAt: page.fetchedAt.toISOString(),
        expiresAt: page.bodyExpiresAt?.toISOString() ?? null,
        html,
      },
    });
  },
);
