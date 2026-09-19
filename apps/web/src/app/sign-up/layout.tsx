import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isPublicBrowseEnabled } from '@/lib/launch-mode'
import { verifyInviteCookie, INVITE_COOKIE_NAME } from '@/lib/invite-cookie'

export const dynamic = 'force-dynamic'

export default async function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Once launched an account costs no invite code, and middleware already
  // says so — `/sign-up` is in `isPublicOnceLaunched`. This layout ignored the
  // flag and sent every signed-out visitor to the invite screen anyway, which
  // made the public funnel's own primary conversion path a dead end: the
  // landing page's "Sign up free", the signed-out account menu, and PR-F's
  // watch → sign-up hand-off all bounce. The same fix went into middleware
  // when /sign-up joined that list; the layout was missed.
  if (isPublicBrowseEnabled()) return <>{children}</>

  const secret = process.env.INVITE_COOKIE_SECRET
  if (!secret) redirect('/auth/code')

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(INVITE_COOKIE_NAME)?.value
  const verified = cookieValue ? verifyInviteCookie(cookieValue, secret) : null

  if (!verified) redirect('/auth/code')

  return <>{children}</>
}
