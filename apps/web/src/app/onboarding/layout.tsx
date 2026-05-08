import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyInviteCookie, INVITE_COOKIE_NAME } from '@/lib/invite-cookie'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const secret = process.env.INVITE_COOKIE_SECRET
  if (!secret) throw new Error('INVITE_COOKIE_SECRET is not set')

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(INVITE_COOKIE_NAME)?.value
  const verified = cookieValue ? verifyInviteCookie(cookieValue, secret) : null

  if (!verified) {
    redirect('/auth/code')
  }

  return <>{children}</>
}
