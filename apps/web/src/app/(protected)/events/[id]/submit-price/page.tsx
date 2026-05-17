import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { SubmitForm } from '@/components/consumer/SubmitForm'
import { apiClient } from '@/lib/api'
import type { Event, SubmissionListResponse } from '@concert-crawl/types'

interface SubmitPricePageProps {
  params: Promise<{ id: string }>
}

export default async function SubmitPricePage({
  params,
}: SubmitPricePageProps) {
  const { id } = await params
  const { userId, getToken } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()
  if (!token) redirect('/sign-in')

  const eventFetch = apiClient.get<Event & { venue: { name: string } }>(
    `/v1/events/${id}`,
    token,
  )

  const submissionsFetch: Promise<SubmissionListResponse | null> = apiClient
    .get<SubmissionListResponse>(`/v1/events/${id}/price-submissions`, token)
    .catch(() => null)

  const [event, submissionsResult] = await Promise.all([
    eventFetch.catch(() => null),
    submissionsFetch,
  ])

  if (!event) notFound()

  const { alreadySubmitted, userSubmission } = submissionsResult ?? {
    alreadySubmitted: false,
    userSubmission: null,
  }

  return (
    <main className="min-h-screen bg-bg">
      {/* Mobile header */}
      <header className="flex items-center justify-between px-5 pt-3 pb-2 sm:hidden">
        <a
          href={`/events/${id}`}
          className="text-[11px] font-bold uppercase tracking-widest font-mono text-fg-muted"
        >
          ← Back
        </a>
      </header>

      {/* Desktop header */}
      <header className="hidden sm:flex items-center justify-between px-8 py-4">
        <span className="text-base font-bold text-fg">Concert Crawl</span>
        <a
          href={`/events/${id}`}
          className="text-sm text-fg-muted hover:text-fg"
        >
          ← Back to {event.artist}
        </a>
      </header>

      <div className="px-5 pt-3 pb-4 sm:mx-auto sm:max-w-[520px] sm:px-8 sm:pt-8 sm:pb-10">
        <SubmitForm
          event={event}
          venueName={event.venue.name}
          initialAlreadySubmitted={alreadySubmitted}
          userSubmission={userSubmission}
        />
      </div>
    </main>
  )
}
