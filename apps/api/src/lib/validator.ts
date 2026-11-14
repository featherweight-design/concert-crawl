import './zod-messages.js';
import type { Context } from 'hono';
import { z } from 'zod';

/**
 * One person by their whole handle, as a query param (`?handle=` on Prices,
 * `?actorHandle=` on the audit log). A leading "@" is ignored, and the value
 * is lowercased because handles are stored lowercase (`HANDLE_REGEX` in
 * routes/users.ts), so `@Hugh` finds `hugh`.
 */
export const handleQuerySchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, '').toLowerCase())
  .pipe(z.string().min(1).max(100))
  .optional();

/**
 * The failure hook every `zValidator` call passes. Without a hook,
 * `@hono/zod-validator` answers a bad request with `c.json(result, 400)`, so
 * the body is whatever the ZodError serialises to. On Zod 3 that is
 * `{ issues, name }`; on Zod 4 it is `{ name, message }`, which drops the issue
 * list the web reads (`parseZodIssues` in apps/web/src/lib/api.ts). This hook
 * writes the body explicitly, so the contract stays
 * `{ success: false, error: { issues, name: 'ZodError' } }` whatever Zod
 * version is installed.
 */
export function validationHook(
  result:
    | { success: true }
    | { success: false; error: { issues: readonly unknown[] } },
  ctx: Context,
): Response | undefined {
  if (result.success) return undefined;
  return zodIssuesResponse(ctx, result.error.issues);
}

/**
 * The 400 body `parseZodIssues` reads, for a handler that refuses a field
 * after validation (the hook above is the other writer). One owner for the
 * contract `{ success: false, error: { issues, name: 'ZodError' } }`.
 */
export function zodIssuesResponse(
  ctx: Context,
  issues: readonly unknown[],
): Response {
  return ctx.json({ success: false, error: { issues, name: 'ZodError' } }, 400);
}
