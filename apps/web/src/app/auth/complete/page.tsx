import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { verifyInviteCookie, INVITE_COOKIE_NAME } from '@/lib/invite-cookie'

export default async function AuthCompletePage() {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/sign-in')

  const secret = process.env.INVITE_COOKIE_SECRET
  if (!secret) {
    redirect('/events')
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
      }
    } catch {
      // Network failure — leave cookie so the next load can retry
    }
  }

  redirect('/events')
}
