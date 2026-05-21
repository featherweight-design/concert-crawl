import { auth } from '@/lib/auth'
import { fetchWatching } from '@/lib/watching'
import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'
import { WatchingContent } from '@/components/consumer/watching/WatchingContent'

export const metadata = { title: 'Watching — Concert Crawl' }

export default async function WatchingPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const shows = await fetchWatching(token)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <AppHeader />
      <WatchingContent initialShows={shows} />
      <BottomNav />
    </div>
  )
}
