import { isIP } from 'node:net';
import type { Context } from 'hono';
import { apiLogger } from './logger.js';
import { hasServiceKey } from './service-key.js';

/**
 * The visitor's IP, for keying per-IP rate limits. The one place the API
 * derives it: a route that needs an IP calls this, never a header of its own.
 * Key a limit with `rateLimitKeyForIp(clientIp(ctx))`, not the raw address.
 *
 * Both projects run on Vercel, which overwrites `x-forwarded-for` and sets
 * `x-vercel-forwarded-for` and `x-real-ip` to the same client address
 * (https://vercel.com/docs/headers/request-headers). Those two are read only
 * when running on Vercel (`VERCEL` is set); anywhere else a client could send
 * them itself, so only the first `x-forwarded-for` hop is read, as before.
 *
 * A call from the web project's server (a server action, SSR) is not seen as
 * the visitor: Vercel sees the web function as the client, so every visitor
 * would share the web project's IP and one visitor's misses would lock
 * everyone out. The web server forwards the visitor's address as
 * `x-client-ip`, and that is trusted only beside the shared service key, so a
 * browser cannot pick its own bucket by sending the header itself.
 */
export function clientIp(ctx: Context): string {
  const forwarded = ctx.req.header('x-client-ip')?.trim();
  if (forwarded) {
    if (!isWellFormedIp(forwarded)) {
      apiLogger.warn(
        { reason: 'malformed' },
        'Ignored x-client-ip: not a well-formed IP',
      );
    } else if (!hasServiceKey(ctx)) {
      apiLogger.warn(
        { reason: 'no_service_key' },
        'Ignored x-client-ip: missing or wrong service key',
      );
    } else {
      return forwarded;
    }
  }

  const proxyHeaders = process.env['VERCEL']
    ? ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for']
    : ['x-forwarded-for'];
  for (const name of proxyHeaders) {
    const first = ctx.req.header(name)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/**
 * The bucket an address is limited under. IPv4 is keyed as is. An
 * IPv4-mapped IPv6 address (`::ffff:a.b.c.d`) is keyed as its IPv4. Any other
 * IPv6 address is keyed to its /64, because one subscriber is normally handed
 * a whole /64 and could otherwise rotate through it for a fresh budget per
 * address. The prefix is taken from the fully expanded form, so every
 * spelling of one address (`::` compression, leading zeros, case, a zone)
 * lands in the same bucket. Anything else (`'unknown'`) passes through.
 */
export function rateLimitKeyForIp(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  const hextets = expandIpv6(ip);
  if (!hextets) return ip;

  const isMappedIpv4 =
    hextets.slice(0, 5).every((hextet) => hextet === 0) &&
    hextets[5] === 0xffff;
  if (isMappedIpv4) {
    const high = hextets[6] ?? 0;
    const low = hextets[7] ?? 0;
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
  }

  const prefix = hextets
    .slice(0, 4)
    .map((hextet) => hextet.toString(16))
    .join(':');
  return `${prefix}::/64`;
}

/** The longest textual IPv6 form (an IPv4-mapped address) is 45 characters. */
const MAX_IP_LENGTH = 45;

function isWellFormedIp(value: string): boolean {
  return value.length <= MAX_IP_LENGTH && isIP(value) !== 0;
}

/** Eight hextets for an IPv6 address already accepted by `isIP`, else null. */
function expandIpv6(ip: string): number[] | null {
  const address = (ip.split('%')[0] ?? '').toLowerCase();
  const halves = address.split('::');
  if (halves.length > 2) return null;

  const head = parseGroups(halves[0] ?? '');
  const tail = halves.length === 2 ? parseGroups(halves[1] ?? '') : [];
  if (!head || !tail) return null;

  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
}

/** Colon-separated groups to hextets; a dotted IPv4 tail is two hextets. */
function parseGroups(part: string): number[] | null {
  if (part === '') return [];
  const hextets: number[] = [];
  for (const group of part.split(':')) {
    if (group.includes('.')) {
      const octets = group.split('.').map(Number);
      if (
        octets.length !== 4 ||
        octets.some((octet) => !Number.isInteger(octet) || octet > 255)
      ) {
        return null;
      }
      const [first = 0, second = 0, third = 0, fourth = 0] = octets;
      hextets.push((first << 8) | second, (third << 8) | fourth);
    } else if (/^[0-9a-f]{1,4}$/.test(group)) {
      hextets.push(Number.parseInt(group, 16));
    } else {
      return null;
    }
  }
  return hextets;
}
