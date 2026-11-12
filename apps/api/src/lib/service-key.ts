import { timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';

/**
 * Whether the request carries `x-service-key` equal to INTERNAL_API_SECRET,
 * the shared secret the web server sends on its own calls. Compared in
 * constant time; an unset or empty secret never matches. The one check every
 * caller uses, so the comparison cannot drift between them.
 */
export function hasServiceKey(ctx: Context): boolean {
  const secret = process.env['INTERNAL_API_SECRET'];
  const provided = ctx.req.header('x-service-key');
  if (!secret || !provided) return false;
  const expectedBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
