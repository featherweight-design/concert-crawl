'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  signInviteCookie,
  INVITE_COOKIE_NAME,
  INVITE_COOKIE_MAX_AGE,
  RETURN_PATH_COOKIE_NAME,
} from '@/lib/invite-cookie'
import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from '@/lib/auth/intent'

type ValidationResult =
  | { ok: true }
  | {
      ok: false
      error:
        | 'invalid_format'
        | 'notfound'
        | 'used'
        | 'expired'
        | 'ratelimit'
        | 'server_error'
    }

export async function validateAndSetInviteCode(
  code: string,
  // The `redirect_url` the middleware attached when it bounced an invite-gated
  // route here. Arrives from the querystring, so it is attacker-controllable
  // and is sanitised before it is written anywhere.
  returnPath?: string | null,
): Promise<ValidationResult> {
  const codePattern = /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  if (!codePattern.test(code.toUpperCase())) {
    return { ok: false, error: 'invalid_format' }
  }

  const normalizedCode = code.toUpperCase()

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const res = await fetch(`${apiUrl}/v1/auth/validate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalizedCode }),
    })

    if (res.status === 404) return { ok: false, error: 'notfound' }
    if (res.status === 409) return { ok: false, error: 'used' }
    if (res.status === 410) return { ok: false, error: 'expired' }
    if (res.status === 429) return { ok: false, error: 'ratelimit' }
    if (!res.ok) return { ok: false, error: 'server_error' }
  } catch {
    return { ok: false, error: 'server_error' }
  }

  const secret = process.env.INVITE_COOKIE_SECRET
  if (!secret) throw new Error('INVITE_COOKIE_SECRET is not set')

  const cookieValue = signInviteCookie(normalizedCode, secret)
  const cookieStore = await cookies()
  cookieStore.set(INVITE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INVITE_COOKIE_MAX_AGE,
    path: '/',
  })

  // A second signed cookie beside invite_verified, because a query param
  // cannot cross Clerk's screens. Only written when there is somewhere other
  // than the default to go — a visitor who came in the front door leaves no
  // cookie behind and lands on /events exactly as before.
  const safeReturn = sanitizeReturnPath(returnPath)
  if (safeReturn === DEFAULT_RETURN_PATH) {
    // Nothing to carry, so clear whatever an abandoned earlier attempt left
    // behind. Otherwise a stale cookie survives to be spent on a later,
    // unrelated trip through the funnel and lands the visitor somewhere they
    // never asked to go.
    cookieStore.delete(RETURN_PATH_COOKIE_NAME)
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
    )
  }

  // Straight to sign-up, not into the tour. The walkthrough runs AFTER the
  // account exists (`/auth/complete` sends them on), because every step past
  // the genre picker reads as the signed-in user: the artist suggestions read
  // needs a Clerk token, and the follow write it commits needs one too. Running
  // the tour on a visitor with only an invite cookie made step 7 fail for
  // everyone, every time. It also matches the launched funnel, where there is
  // no invite step and sign-up is the front door.
  redirect('/sign-up')
}
