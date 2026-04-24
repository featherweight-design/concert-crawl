import { auth } from '@clerk/nextjs/server'

export default async function EventsPage() {
  const { userId } = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Concert Crawl</h1>
      <p className="text-gray-500">Events calendar coming in Phase 4.</p>
      <p className="text-sm text-gray-400">Signed in as: {userId}</p>
    </main>
  )
}
