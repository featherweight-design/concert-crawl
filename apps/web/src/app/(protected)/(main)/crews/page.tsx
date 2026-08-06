import { headers } from 'next/headers'
import type { CrewSummary } from '@concert-crawl/types'
import { auth } from '@/lib/auth'
import { fetchCrews } from '@/lib/crews'
import { isScaRegion } from '@/lib/sca-region'
import { CrewsContent } from '@/components/consumer/crews'

export const metadata = { title: 'Crews — Concert Crawl' }

export default async function CrewsPage() {
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
