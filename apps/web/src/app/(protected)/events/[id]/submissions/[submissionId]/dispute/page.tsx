import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { DisputeForm } from '@/components/consumer/DisputeForm'
import type { Event, PriceSubmission } from '@concert-crawl/types'

interface DisputePageProps {
  params: Promise<{ id: string; submissionId: string }>
}

export default async function DisputePage({ params }: DisputePageProps) {
  const { id, submissionId } = await params
  const { userId, getToken } = await auth()
  if (!userId) redirect('/sign-in')

  const token = await getToken()

  const [eventRes, submissionRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/events/${id}`),
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${submissionId}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    ),
  ])

  if (!eventRes.ok || !submissionRes.ok) notFound()

  const eventData = (await eventRes.json()) as {
    data: Event & { venue: { name: string } }
  }
  const event = eventData.data

  const submissionData = (await submissionRes.json()) as {
    data: PriceSubmission
  }
  const submission = submissionData.data

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
          ← Cancel
        </a>
        <p className="text-sm font-semibold text-fg">Dispute price</p>
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
          <p className="text-xs text-fg-muted mb-1">You&apos;re disputing</p>
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
          A dispute needs an alternate price + vendor. If you saw something
          different, log it — that&apos;s how we find the truth.
        </p>

        <DisputeForm submission={submission} eventId={id} />
      </div>
    </main>
  )
}
