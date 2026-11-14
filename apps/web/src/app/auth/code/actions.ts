'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  signInviteCookie,
  INVITE_COOKIE_NAME,
  INVITE_COOKIE_MAX_AGE,
  RETURN_PATH_COOKIE_NAME,
} from '@/lib/invite-cookie';
import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from '@/lib/auth/intent';
import { serviceKeyHeaders } from '@/lib/api';
import { isInviteCodeShape, normalizeInviteCode } from '@concert-crawl/types';

type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'invalid_format'
        | 'notfound'
        | 'used'
        | 'expired'
        | 'ended'
        | 'ratelimit'
        | 'server_error';
    };

/**
 * The visitor's address as Vercel reports it to this function. Vercel sets
 * `x-vercel-forwarded-for` and `x-real-ip` to the same client IP and
 * overwrites `x-forwarded-for` (https://vercel.com/docs/headers/request-headers).
 */
async function visitorIp(): Promise<string | undefined> {
  const incoming = await headers();
  for (const name of [
    'x-vercel-forwarded-for',
    'x-real-ip',
    'x-forwarded-for',
  ]) {
    const first = incoming.get(name)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return undefined;
}

/**
 * This action calls the API from the web function, so the API sees the web
 * project's IP for every visitor and its per-IP miss limit would become one
 * bucket for everyone. Forward the visitor's IP, vouched for by the shared
 * service key; the API trusts `x-client-ip` only beside that key. Without the
 * secret neither header is sent and the API falls back to the shared bucket,
 * which fails safe (stricter, never looser).
 *
 * The key comes from lib/api's builder, but not its `request()`: this route
 * answers `{ ok: true }` rather than the `{ success, data }` envelope
 * `request()` unwraps, and the caller branches on the raw status.
 */
async function forwardedIpHeaders(): Promise<Record<string, string>> {
  const service = serviceKeyHeaders();
  if (!service['x-service-key']) return {};
  const ip = await visitorIp();
  if (!ip) return {};
  return { ...service, 'x-client-ip': ip };
}

export async function validateAndSetInviteCode(
  code: string,
  // The `redirect_url` the middleware attached when it bounced an invite-gated
  // route here. Arrives from the querystring, so it is attacker-controllable
  // and is sanitised before it is written anywhere.
  returnPath?: string | null,
): Promise<ValidationResult> {
  // Generated (BETA-XXXX-XXXX) or custom (4 to 20 letters and numbers); the
  // API checks the same shapes. Codes are not case-sensitive.
  const normalizedCode = normalizeInviteCode(code);
  if (!isInviteCodeShape(normalizedCode)) {
    return { ok: false, error: 'invalid_format' };
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/v1/auth/validate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await forwardedIpHeaders()),
      },
      body: JSON.stringify({ code: normalizedCode }),
    });

    if (res.status === 404) return { ok: false, error: 'notfound' };
    if (res.status === 409) return { ok: false, error: 'used' };
    if (res.status === 410) {
      // 410 is both "expired" and "ended" (an admin revoked the code); the
      // body says which, and an unreadable one is the older answer.
      const body: unknown = await res.json().catch(() => null);
      const ended =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        body.error === 'ended';
      return { ok: false, error: ended ? 'ended' : 'expired' };
    }
    if (res.status === 429) return { ok: false, error: 'ratelimit' };
    if (!res.ok) return { ok: false, error: 'server_error' };
  } catch {
    return { ok: false, error: 'server_error' };
  }

  const secret = process.env.INVITE_COOKIE_SECRET;
  if (!secret) throw new Error('INVITE_COOKIE_SECRET is not set');

  const cookieValue = signInviteCookie(normalizedCode, secret);
  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INVITE_COOKIE_MAX_AGE,
    path: '/',
  });

  // A second signed cookie beside invite_verified, because a query param
  // cannot cross Clerk's screens. Only written when there is somewhere other
  // than the default to go — a visitor who came in the front door leaves no
  // cookie behind and lands on /events exactly as before.
  const safeReturn = sanitizeReturnPath(returnPath);
  if (safeReturn === DEFAULT_RETURN_PATH) {
    // Nothing to carry, so clear whatever an abandoned earlier attempt left
    // behind. Otherwise a stale cookie survives to be spent on a later,
    // unrelated trip through the funnel and lands the visitor somewhere they
    // never asked to go.
    cookieStore.delete(RETURN_PATH_COOKIE_NAME);
  } else {
    cookieStore.set(
      RETURN_PATH_COOKIE_NAME,
      signInviteCookie(safeReturn, secret),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: INVITE_COOKIE_MAX_AGE,
        path: '/',
      },
    );
  }

  // Straight to sign-up, not into the tour. The walkthrough runs AFTER the
  // account exists (`/auth/complete` sends them on), because every step past
  // the genre picker reads as the signed-in user: the artist suggestions read
  // needs a Clerk token, and the follow write it commits needs one too. Running
  // the tour on a visitor with only an invite cookie made step 7 fail for
  // everyone, every time. It also matches the launched funnel, where there is
  // no invite step and sign-up is the front door.
  redirect('/sign-up');
}
