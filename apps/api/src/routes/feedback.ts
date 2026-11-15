// apps/api/src/routes/feedback.ts
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { z } from 'zod';
import { db, feedback } from '@concert-crawl/db';
import {
  feedbackScreenshotRejection,
  isFeedbackScreenshot,
} from '@concert-crawl/types';
import { bodyLimit } from 'hono/body-limit';
import { checkRateLimit } from '../lib/rate-limit.js';
import { apiLogger } from '../lib/logger.js';

const errorIdSchema = z.string().regex(/^[\w-]{1,64}$/);

const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'praise', 'other']),
  message: z.string().min(1, 'Message is required').max(2000),
  pageUrl: z.string().max(2048),
  metadata: z
    .object({
      theme: z.string().optional(),
      build: z.string().optional(),
      device: z.string().optional(),
      // Checked in the handler (storedMetadata), which drops anything that is
      // not our own inline image format rather than failing the request.
      // .optional() is load-bearing: in Zod 4 a key whose schema is not
      // optional is required, even z.unknown(), so without it every report
      // with no screenshot key failed with a 422.
      screenshot: z.unknown().optional(),
      // A problem report filed from an error page. The ids tie it to what the
      // team already holds (the server digest, or the browser's Sentry event)
      // and are shape-checked so the column only ever carries an id. The
      // reporter's own words stay here, never in Sentry.
      source: z.literal('error').optional(),
      doing: z.string().trim().max(1000).optional(),
      digest: errorIdSchema.optional(),
      sentryEventId: errorIdSchema.optional(),
    })
    .optional(),
});

// The write cap on a screenshot (8M chars) plus room for the rest of a report.
export const MAX_FEEDBACK_BODY_BYTES = 9 * 1024 * 1024;

type FeedbackMetadata = NonNullable<z.infer<typeof feedbackSchema>['metadata']>;

/**
 * The metadata to store. The fan form sends the picked file as an inline data
 * image; anything else (an http(s) URL, javascript:, svg, an oversized image)
 * is dropped rather than failing the request, so the fan's report still lands
 * without it: the admin's browser must never be sent to a host the reporter
 * chose. A drop is logged with its reason only, never the value.
 */
const storedMetadata = (metadata: FeedbackMetadata | undefined) => {
  if (!metadata) return null;
  const { screenshot, ...rest } = metadata;
  if (screenshot == null) return rest;
  if (isFeedbackScreenshot(screenshot)) return { ...rest, screenshot };
  apiLogger.warn(
    { reason: feedbackScreenshotRejection(screenshot) },
    'feedback screenshot dropped',
  );
  return rest;
};

export const feedbackRouter = new Hono();

feedbackRouter.use('*', clerkMiddleware());

feedbackRouter.post(
  '/',
  bodyLimit({
    maxSize: MAX_FEEDBACK_BODY_BYTES,
    onError: (ctx) =>
      ctx.json({ success: false, error: 'Feedback is too large' }, 413),
  }),
  async (ctx) => {
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
        metadata: storedMetadata(metadata),
      });
    } catch (err) {
      apiLogger.error(
        { err, userId: authInfo.userId },
        'feedback insert failed',
      );
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
  },
);
