import type { Context } from 'hono';

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
  return ctx.json(
    {
      success: false,
      error: { issues: result.error.issues, name: 'ZodError' },
    },
    400,
  );
}
