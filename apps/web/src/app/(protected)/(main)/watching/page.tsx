import { auth } from '@/lib/auth'
import { fetchWatching } from '@/lib/watching'
import { WatchingContent } from '@/components/consumer/watching'

export const metadata = { title: 'Watching — Concert Crawl' }

export default async function WatchingPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const shows = await fetchWatching(token)

  return <WatchingContent initialShows={shows} />
}
