import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { Context } from 'hono';

/**
 * The visitor's IP, for keying per-IP rate limits. The one place the API
 * derives it: a route that needs an IP calls this, never a header of its own.
 *
 * Both projects run on Vercel, which overwrites `x-forwarded-for` and sets
 * `x-vercel-forwarded-for` and `x-real-ip` to the same client address
 * (https://vercel.com/docs/headers/request-headers). A browser calling the API
 * directly is therefore seen as itself.
 *
 * A call from the web project's server (a server action, SSR) is not: Vercel
 * sees the web function as the client, so every visitor would share the web
 * project's IP and one visitor's misses would lock everyone out. The web
 * server forwards the visitor's address as `x-client-ip`, and that is trusted
 * only beside the shared `INTERNAL_API_SECRET`, so a browser cannot pick its
 * own bucket by sending the header itself.
 */
export function clientIp(ctx: Context): string {
  const forwarded = ctx.req.header('x-client-ip')?.trim();
  if (
    forwarded &&
    isWellFormedIp(forwarded) &&
    hasServiceKey(ctx.req.header('x-service-key'))
  ) {
    return forwarded;
  }

  for (const name of [
    'x-vercel-forwarded-for',
    'x-real-ip',
    'x-forwarded-for',
  ]) {
    const first = ctx.req.header(name)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/** The longest textual IPv6 form (an IPv4-mapped address) is 45 characters. */
const MAX_IP_LENGTH = 45;

function isWellFormedIp(value: string): boolean {
  return value.length <= MAX_IP_LENGTH && isIP(value) !== 0;
}

/** Constant-time match against INTERNAL_API_SECRET; an unset secret never matches. */
function hasServiceKey(provided: string | undefined): boolean {
  const secret = process.env['INTERNAL_API_SECRET'];
  if (!secret || !provided) return false;
  const expectedBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
