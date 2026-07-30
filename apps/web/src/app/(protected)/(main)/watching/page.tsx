import { auth } from '@/lib/auth'
import { fetchWatching } from '@/lib/watching'
import {
  WatchingContent,
  WatchingSignedOut,
} from '@/components/consumer/watching'

export const metadata = { title: 'Watching — Concert Crawl' }

export default async function WatchingPage() {
  const { getToken } = await auth()
  const token = await getToken()
  // Public route, gated payload: the teaching state renders for anyone, but a
  // watch list is per-user authenticated data. Keep this guard above the fetch
  // — moving the token read below the render is how this leaks.
  if (!token) return <WatchingSignedOut />

  const shows = await fetchWatching(token)

  return <WatchingContent initialShows={shows} />
}
