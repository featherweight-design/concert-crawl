import { notFound } from 'next/navigation'
import type { CrewDetail } from '@concert-crawl/types'

import { auth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { fetchCrew } from '@/lib/crews'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { CrewHome } from '@/components/consumer/crews'

export const metadata = { title: 'Crew — Concert Crawl' }

export default async function CrewPage({
  params,
}: {
  params: Promise<{ crewId: string }>
}) {
  // Before any auth or data work, so a flagged-off route does nothing and
  // leaks nothing through a timing or error difference.
  if (!(await isFeatureEnabled('crews'))) notFound()

  const { crewId } = await params
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  let crew: CrewDetail
  try {
    crew = await fetchCrew(token, crewId)
  } catch (err) {
    // The API answers 403 whether or not the crew exists, so ids stay
    // unprobeable. Both answers become the same 404 here for the same reason:
    // a distinct "you're not in this one" would confirm it exists.
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      notFound()
    }
    // Anything else is a real failure, so it reaches error.tsx and its retry
    // rather than being painted as a missing crew.
    console.error('[crews] detail load failed', err)
    throw err
  }

  return <CrewHome crew={crew} />
}
