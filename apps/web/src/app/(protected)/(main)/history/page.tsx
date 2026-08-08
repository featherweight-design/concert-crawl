import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { fetchHistory } from '@/lib/history'
import { isScaRegion } from '@/lib/sca-region'
import { HistoryContent } from '@/components/consumer/history'

export const metadata = { title: 'Concerts — Concert Crawl' }

export default async function HistoryPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // A 403 comes back as { data: null, locked: true } — the state the page
  // paints, not a failure.
  const { data, locked } = await fetchHistory(token)

  const requestHeaders = await headers()
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  return (
    <HistoryContent initialData={data} locked={locked} scaRegion={scaRegion} />
  )
}
