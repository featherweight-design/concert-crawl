import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { DisputeForm } from '@/components/consumer/DisputeForm'
import { apiClient } from '@/lib/api'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import type { Event, PriceSubmission } from '@concert-crawl/types'

interface DisputePageProps {
  params: Promise<{ id: string; submissionId: string }>
}

// Auth gating handled by edge middleware (apps/web/src/middleware.ts); this
// page only runs for authenticated users (#841). The token-null guard remains
// because getToken() can transiently return null during session refresh.
export default async function DisputePage({ params }: DisputePageProps) {
  const { id, submissionId } = await params
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/sign-in')

  const eventFetch = apiClient.get<Event & { venue: { name: string } }>(
    `/v1/events/${id}`,
    token,
  )

  const submissionFetch = apiClient.get<PriceSubmission>(
    `/v1/submissions/${submissionId}`,
    token,
  )

  const [event, submission] = await Promise.all([
    eventFetch.catch(() => null),
    submissionFetch.catch(() => null),
  ])

  if (!event || !submission) notFound()

  const dateStr = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  })

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-5 py-4">
        <a href={`/events/${id}`} className="text-sm text-fg-muted">
          {CONSUMER_COPY.disputePage.cancelLink}
        </a>
        <p className="text-sm font-semibold text-fg">
          {CONSUMER_COPY.disputePage.heading}
        </p>
        <div className="w-16" />
      </header>

      <div className="px-5 pb-6 flex flex-col gap-5 sm:mx-auto sm:max-w-[520px]">
        {/* Context */}
        <div>
          <p className="text-xs font-mono text-fg-muted uppercase tracking-wider">
            {event.artist}
          </p>
          <p className="text-xs font-mono text-fg-subtle">
            {event.venue.name} · {dateStr}
          </p>
        </div>

        {/* Disputed submission card */}
        <div className="rounded-xl border border-border p-4 bg-surface-1">
          <p className="text-xs text-fg-muted mb-1">
            {CONSUMER_COPY.disputePage.disputingLabel}
          </p>
          <p className="text-lg font-black text-fg">
            ${submission.priceMin}
            {submission.priceMax ? ` – $${submission.priceMax}` : ''}{' '}
            <span className="text-xs font-mono text-fg-muted">
              {submission.tier}
            </span>
          </p>
          <p className="text-xs font-mono text-fg-muted">{submission.vendor}</p>
        </div>

        <p className="text-xs text-fg-muted">
          {CONSUMER_COPY.disputePage.requirement}
        </p>

        <DisputeForm submission={submission} eventId={id} />
      </div>
    </main>
  )
}
