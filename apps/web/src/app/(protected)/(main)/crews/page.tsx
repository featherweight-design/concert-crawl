import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { CrewSummary } from '@concert-crawl/types'
import { auth } from '@/lib/auth'
import { fetchCrews } from '@/lib/crews'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { isScaRegion } from '@/lib/sca-region'
import { CrewsContent } from '@/components/consumer/crews'

export const metadata = { title: 'Crews — Concert Crawl' }

export default async function CrewsPage() {
  // Before any auth or data work, so a flagged-off route does nothing and
  // leaks nothing through a timing or error difference.
  if (!(await isFeatureEnabled('crews'))) notFound()

  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // A failed load is a state this page paints, not a thrown boundary: the
  // error treatment carries its own retry, and the route boundary's generic
  // one would lose the header entirely.
  let crews: CrewSummary[] | null = null
  try {
    crews = await fetchCrews(token)
  } catch (err) {
    console.error('[crews] list load failed', err)
  }

  const requestHeaders = await headers()
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  return <CrewsContent initialCrews={crews} scaRegion={scaRegion} />
}
