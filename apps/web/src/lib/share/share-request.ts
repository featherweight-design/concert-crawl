import {
  isShareRatio,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios';
import { resolveThemeTokens } from '@/lib/share/theme-tokens';
import type { ThemeName } from '@/theme/themes';

/**
 * Input validation for the share PNG route.
 *
 * Kept out of the route file because a route handler running on the edge is
 * the single worst place to discover a parsing bug: the failure mode is a 500
 * inside an `<img>` that renders as a broken icon on somebody else's timeline.
 * Here it is a pure function with a table of cases.
 *
 * `apps/web` has no Zod dependency — see `lib/share/taglines.ts` for the same
 * closed-set-guard pattern used throughout this feature.
 */

/**
 * Matches `z.string().uuid()` — version nibble 1–5 and an RFC4122 variant —
 * so the guard rejects exactly what `GET /v1/events/:id` would 400 on. Same
 * pattern as `app/e/[id]/page.tsx`; a looser shape would let malformed ids
 * cost a Vercel→Render round-trip.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Handles are drawn onto a raster, so there is nothing to escape — the risk is
 * a 200-character string blowing the footer layout apart, or a control
 * character that satori cannot map to a glyph. An allowlist covers both.
 */
const HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,30}$/;

/** `null` means an anonymous share, which renders no signature line at all. */
export const resolveShareHandle = (raw: string | undefined): string | null => {
  if (raw === undefined) return null;
  const trimmed = raw.startsWith('@') ? raw.slice(1) : raw;
  return HANDLE_PATTERN.test(trimmed) ? `@${trimmed}` : null;
};

/**
 * Locked in the plan: an hour in the browser, a day at the edge, a week of
 * stale-while-revalidate. The card only changes when the event's price or
 * status does, and the ETag catches that.
 */
export const SHARE_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/**
 * A card drawn with IdentityArt because its photo failed to load. The failure
 * is usually transient, so it is held for a minute rather than a day.
 */
export const SHARE_FALLBACK_CACHE_CONTROL = 'public, max-age=60, s-maxage=60';

/** The venue's wall clock at `at`, read back as if it were UTC. */
const wallClockMs = (at: number, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(at);
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  return Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );
};

/**
 * Seconds from `now` to the venue's next midnight, as a real instant: on a
 * DST day the local day is 23 or 25 hours long, so "86,400 minus the seconds
 * elapsed" is an hour off. Tomorrow's 00:00 is resolved to UTC through the
 * zone's offset at that moment (US changes happen at 2am, never at midnight).
 */
export const secondsUntilLocalMidnight = (
  now: Date,
  timezone: string,
): number => {
  const wall = new Date(wallClockMs(now.getTime(), timezone));
  const midnightWall = Date.UTC(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate() + 1,
  );
  let instant = midnightWall;
  for (let pass = 0; pass < 2; pass += 1) {
    instant = midnightWall - (wallClockMs(instant, timezone) - instant);
  }
  return Math.max(0, Math.ceil((instant - now.getTime()) / 1000));
};

/**
 * A card with a countdown ("4 DAYS AWAY") is only true until the venue's
 * midnight, so no cache may hold it past then, and there is no
 * stale-while-revalidate: a stale serve would be yesterday's count. A card
 * whose photo failed is held for a minute. Every other card keeps the locked
 * header.
 */
export const shareCacheControl = (
  countdown: string | null,
  timezone: string,
  now: Date = new Date(),
  photoMissing = false,
): string => {
  if (countdown === null) {
    return photoMissing ? SHARE_FALLBACK_CACHE_CONTROL : SHARE_CACHE_CONTROL;
  }
  const ttl = secondsUntilLocalMidnight(now, timezone);
  if (photoMissing) {
    const life = Math.min(60, ttl);
    return `public, max-age=${life}, s-maxage=${life}`;
  }
  return `public, max-age=${Math.min(3600, ttl)}, s-maxage=${Math.min(86_400, ttl)}`;
};

/**
 * `If-None-Match` is a comma-separated list, and a cache in front of us is
 * entitled to weaken our tag to `W/"…"` on the way back. Strict equality
 * misses both, and a missed 304 means re-rendering a PNG we already have.
 * Safe to split on commas: the tag this route mints is a uuid plus hex plus
 * two closed-set words, none of which can contain one.
 */
export const etagMatches = (header: string | null, etag: string): boolean => {
  if (header === null) return false;
  if (header.trim() === '*') return true;
  const strip = (tag: string) => tag.trim().replace(/^W\//, '');
  const wanted = strip(etag);
  return header.split(',').some((candidate) => strip(candidate) === wanted);
};

export interface ShareRequestParams {
  eventId: string;
  ratio: string;
  theme?: string | undefined;
  by?: string | undefined;
}

export type ParsedShareRequest =
  | {
      ok: true;
      eventId: string;
      ratio: ShareRatio;
      theme: ThemeName;
      handle: string | null;
    }
  | { ok: false; reason: string };

/**
 * The ratio is a hard reject and the theme is a soft fallback, deliberately:
 * the ratio determines the artboard, so guessing produces a card at the wrong
 * dimensions for whatever asked for it. The B+ card is theme-independent, so
 * the theme is still validated (old links carry it) but draws nothing.
 */
export const parseShareRequest = (
  params: ShareRequestParams,
): ParsedShareRequest => {
  if (!UUID_PATTERN.test(params.eventId)) {
    return { ok: false, reason: 'invalid event id' };
  }
  if (!isShareRatio(params.ratio)) {
    return { ok: false, reason: 'unknown ratio' };
  }
  const { theme } = resolveThemeTokens(params.theme);
  return {
    ok: true,
    eventId: params.eventId,
    ratio: params.ratio,
    theme,
    handle: resolveShareHandle(params.by),
  };
};
