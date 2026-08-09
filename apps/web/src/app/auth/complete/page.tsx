import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import {
  verifyInviteCookie,
  INVITE_COOKIE_NAME,
  RETURN_PATH_COOKIE_NAME,
} from '@/lib/invite-cookie'
import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from '@/lib/auth/intent'

interface AuthCompletePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuthCompletePage({
  searchParams,
}: AuthCompletePageProps) {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/sign-in')

  const secret = process.env.INVITE_COOKIE_SECRET
  if (!secret) {
    redirect(DEFAULT_RETURN_PATH)
  }

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(INVITE_COOKIE_NAME)?.value
  const verified = cookieValue ? verifyInviteCookie(cookieValue, secret) : null

  if (verified) {
    try {
      const token = await getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/v1/auth/redeem-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: verified.code }),
      })
      // Clear cookie only after a definitive response (success or already-used)
      if (res.ok || res.status === 409) {
        cookieStore.delete(INVITE_COOKIE_NAME)
      } else {
        // Non-OK, non-409 (e.g. 400 bad JSON, 500 API error) — the fetch
        // resolved so `catch` doesn't fire, but redemption still failed.
        // Log so it's visible in the Next server logs / Sentry rather
        // than becoming another silent gap now that #1113 routes every
        // signup through this page.
        console.warn('[auth/complete] redeem-code returned non-OK', {
          status: res.status,
        })
      }
    } catch (err) {
      // Network failure — leave cookie so the next load can retry. This
      // page is a Server Component, so the log lands in the Next.js
      // server runtime logs (surfaced in Vercel logs / Sentry), not the
      // browser console. Silent swallow used to hide these entirely; now
      // that #1113 routes every new signup through here they need a trail.
      console.warn('[auth/complete] redeem-code fetch failed', { err })
    }
  }

  // Where the visitor was headed before the funnel took over (#1226). The
  // cookie is signed, but it is still a redirect target, so it is re-sanitised
  // on read and not only on write. Cleared in the same pass — a return path is
  // spent once. /events stays the fallback, so a visitor with no pending
  // return path is unaffected.
  // Clearing keys off the cookie being PRESENT, not off its value being
  // truthy: `Cookie: invite_return_path=` is a cookie whose value is `''`,
  // which verifies to nothing and would otherwise survive every visit.
  const returnCookie = cookieStore.get(RETURN_PATH_COOKIE_NAME)
  const pendingReturn = returnCookie?.value
    ? verifyInviteCookie(returnCookie.value, secret)
    : null
  if (returnCookie) cookieStore.delete(RETURN_PATH_COOKIE_NAME)

  // The launched funnel has no invite step, so nothing writes the cookie and
  // the destination rides a query param forwarded by /sign-up instead. The
  // cookie still wins where both exist: it is signed, and an invite link is a
  // stronger claim on where someone was headed than a param anyone can append.
  const rawReturn = (await searchParams)['return']

  redirect(
    sanitizeReturnPath(
      pendingReturn?.code ?? (typeof rawReturn === 'string' ? rawReturn : null),
    ),
  )
}
