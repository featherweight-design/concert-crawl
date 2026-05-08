import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyInviteCookie, INVITE_COOKIE_NAME } from '@/lib/invite-cookie'

export const dynamic = 'force-dynamic'

export default async function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const secret = process.env.INVITE_COOKIE_SECRET
  if (!secret) redirect('/auth/code')

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(INVITE_COOKIE_NAME)?.value
  const verified = cookieValue ? verifyInviteCookie(cookieValue, secret) : null

  if (!verified) redirect('/auth/code')

  return <>{children}</>
}
