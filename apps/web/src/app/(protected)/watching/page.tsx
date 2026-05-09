import { auth } from '@/lib/auth'
import { fetchWatching } from '@/lib/watching'
import { WatchingRoute } from '@/components/consumer/watching/WatchingRoute'
import { WatchingRouteDesktop } from '@/components/consumer/watching/WatchingRouteDesktop'

export const metadata = { title: 'Watching — Concert Crawl' }

export default async function WatchingPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const shows = await fetchWatching(token)

  return (
    <>
      {/* Mobile (< sm) */}
      <div className="sm:hidden">
        <WatchingRoute initialShows={shows} />
      </div>
      {/* Desktop (sm+) */}
      <div className="hidden sm:block">
        <WatchingRouteDesktop initialShows={shows} />
      </div>
    </>
  )
}
