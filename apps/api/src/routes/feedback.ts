// apps/api/src/routes/feedback.ts
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { and, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, feedback } from '@concert-crawl/db';
import { checkRateLimit } from '../lib/rate-limit.js';
import { apiLogger } from '../lib/logger.js';

const errorIdSchema = z.string().regex(/^[\w-]{1,64}$/);

/**
 * How long an error page report is treated as already filed. The page sends
 * the same errorId again when a send timed out after the server had it, and
 * the resend runs at the next launch, which can be a day later.
 */
const ERROR_REPORT_DEDUPE_MS = 24 * 60 * 60 * 1000;

/**
 * True when this user already filed a report for this error id recently.
 * A lookup failure files the report anyway: a duplicate beats a lost one.
 */
const alreadyFiled = async (
  userId: string,
  errorId: string,
): Promise<boolean> => {
  try {
    const [existing] = await db
      .select({ id: feedback.id })
      .from(feedback)
      .where(
        and(
          eq(feedback.userId, userId),
          sql`${feedback.metadata}->>'errorId' = ${errorId}`,
          gt(feedback.createdAt, new Date(Date.now() - ERROR_REPORT_DEDUPE_MS)),
        ),
      )
      .limit(1);
    return existing !== undefined;
  } catch (err) {
    apiLogger.warn({ err, userId }, 'feedback dedupe lookup failed');
    return false;
  }
};

const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'praise', 'other']),
  message: z.string().min(1, 'Message is required').max(2000),
  pageUrl: z.string().max(2048),
  metadata: z
    .object({
      theme: z.string().optional(),
      build: z.string().optional(),
      device: z.string().optional(),
      screenshot: z.string().nullish(),
      // A problem report filed from an error page. The ids tie it to what the
      // team already holds (the server digest, or the browser's Sentry event)
      // and are shape-checked so the column only ever carries an id. The
      // reporter's own words stay here, never in Sentry.
      source: z.literal('error').optional(),
      doing: z.string().trim().max(1000).optional(),
      digest: errorIdSchema.optional(),
      sentryEventId: errorIdSchema.optional(),
      // The id the standalone error page shows: the digest, or an id minted
      // for a browser throw and tagged on its Sentry event as `error_id`.
      errorId: errorIdSchema.optional(),
    })
    .optional(),
});

export const feedbackRouter = new Hono();

feedbackRouter.use('*', clerkMiddleware());

feedbackRouter.post('/', async (ctx) => {
  const authInfo = getAuth(ctx);
  if (!authInfo?.userId) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const body: unknown = await ctx.req.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return ctx.json(
      {
        success: false,
        error: 'Invalid input',
        details: z.flattenError(parsed.error),
      },
      422,
    );
  }

  // A resend of an error page report the server already holds is a success,
  // not a second row, and doesn't spend the user's rate-limit token.
  const errorId = parsed.data.metadata?.errorId;
  if (errorId !== undefined && (await alreadyFiled(authInfo.userId, errorId))) {
    return ctx.json({ success: true, duplicate: true }, 200);
  }

  // Rate-limit only valid submissions so a malformed body doesn't burn
  // the user's hourly token. Cap at 10/hour per user — beta testers
  // routinely batch-file 2-5 bugs/ideas after a single session, and the
  // earlier 1/hour cap blocked everything after the first submission
  // (issue #828). 10/hour still throttles obvious abuse while leaving
  // real beta-feedback flows headroom.
  const { allowed, retryAfterMs } = await checkRateLimit(
    `feedback:${authInfo.userId}`,
    10,
    60 * 60 * 1000,
    // Fail open: authenticated, low-value to abuse, and a bug report filed
    // during a DB blip is exactly the one we want to receive.
    { onStoreError: 'allow', userId: authInfo.userId },
  );
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    ctx.header('Retry-After', String(retryAfterSec));
    return ctx.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      429,
    );
  }

  const { category, message, pageUrl, metadata } = parsed.data;

  try {
    await db.insert(feedback).values({
      userId: authInfo.userId,
      pageUrl,
      category,
      message,
      metadata: metadata ?? null,
    });
  } catch (err) {
    apiLogger.error({ err, userId: authInfo.userId }, 'feedback insert failed');
    return ctx.json(
      { success: false, error: 'Failed to submit feedback' },
      500,
    );
  }

  apiLogger.info(
    { userId: authInfo.userId, category, pageUrl },
    'feedback submitted',
  );

  return ctx.json({ success: true }, 201);
});
