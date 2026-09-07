import type { PublicCrewInvite } from '@concert-crawl/types'
import { notFound } from 'next/navigation'

import { auth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { isCrewInviteDeadReason, resolveInvite } from '@/lib/crews'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { DeadInviteLink, InviteLanding } from '@/components/consumer/crews'

export const metadata = { title: 'Crew invite — Concert Crawl' }

/**
 * The invite landing. It sits outside `(protected)/(main)` on purpose: this is
 * a full-screen arrival with no bottom nav and no app chrome, the same shape
 * `/onboarding` uses. Middleware still protects it — `/crew/join/...` is in
 * neither public matcher, so it falls through to `auth.protect()` and the
 * viewer is always signed in by the time this renders.
 */
export default async function CrewJoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  // Before any auth or data work, so a flagged-off route does nothing and
  // leaks nothing through a timing or error difference.
  if (!(await isFeatureEnabled('crews'))) notFound()

  const { token: inviteToken } = await params
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  let invite: PublicCrewInvite
  try {
    invite = await resolveInvite(token, inviteToken)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // A token that never existed gets the app's ordinary 404: a branded dead
      // end would confirm which tokens do exist. Expired and retired links are
      // normal outcomes and say so.
      const { reason } = err
      if (!isCrewInviteDeadReason(reason) || reason === 'unknown') notFound()
      return <DeadInviteLink kind={reason} />
    }
    // Anything else is a real failure, so it reaches error.tsx and its retry
    // rather than being painted as a dead link.
    console.error('[crews] invite resolve failed', err)
    throw err
  }

  return <InviteLanding inviteToken={inviteToken} invite={invite} />
}
