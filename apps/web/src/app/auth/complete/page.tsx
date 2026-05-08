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
      await fetch(`${apiUrl}/v1/auth/redeem-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verified.code }),
      })
    } catch {
      // Redemption failed — not fatal, user still gets in
    } finally {
      cookieStore.delete(INVITE_COOKIE_NAME)
    }
  }

  redirect('/events')
}
