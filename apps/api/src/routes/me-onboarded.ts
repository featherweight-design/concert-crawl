// apps/api/src/routes/me-onboarded.ts
// POST /v1/me/onboarded: the signed-in person finished or skipped the tour.
//
// It stamps Clerk publicMetadata.onboardedAt, which the session token carries
// as `metadata.onboardedAt`, so the web proxy can stop sending a new account
// to /onboarding without a request of its own. First write wins: a repeat call
// (Finish after a retry, two tabs) returns the stamp already there.
import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { createClerkClient } from '@clerk/backend';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { validationHook } from '../lib/validator.js';
import { apiLogger } from '../lib/logger.js';

// No fields: the server decides the time. `.strict()` rejects anything sent.
const onboardedBodySchema = z.object({}).strict();

const storedStampSchema = z.iso.datetime();

export const meOnboardedRouter = new Hono();

meOnboardedRouter.use('*', clerkMiddleware());

meOnboardedRouter.post(
  '/onboarded',
  zValidator('json', onboardedBodySchema, validationHook),
  async (ctx) => {
    const userId = getAuth(ctx)?.userId ?? null;
    if (!userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const secretKey = process.env['CLERK_SECRET_KEY'];
    if (!secretKey) {
      apiLogger.error({ userId }, 'me-onboarded: CLERK_SECRET_KEY not set');
      return ctx.json({ success: false, error: 'Not configured' }, 503);
    }
    try {
      const clerkClient = createClerkClient({ secretKey });
      const user = await clerkClient.users.getUser(userId);
      const existing = storedStampSchema.safeParse(
        user.publicMetadata['onboardedAt'],
      );
      if (existing.success) {
        return ctx.json({
          success: true,
          data: { onboardedAt: existing.data },
        });
      }
      const onboardedAt = new Date().toISOString();
      // updateUserMetadata merges, so role and plan are kept.
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: { onboardedAt },
      });
      apiLogger.info({ userId, onboardedAt }, 'me-onboarded: tour completed');
      return ctx.json({ success: true, data: { onboardedAt } });
    } catch (err) {
      apiLogger.error({ err, userId }, 'me-onboarded: Clerk write failed');
      return ctx.json({ success: false, error: 'Could not save' }, 502);
    }
  },
);
