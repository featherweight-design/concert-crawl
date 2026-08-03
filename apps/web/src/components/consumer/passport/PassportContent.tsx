'use client'

// The /passport route body (#85).
//
// The Passport is drawn from Concert History, so it is gated on the same
// entitlement and locked by the same component — a second lock screen saying
// the same thing in different words is how two surfaces of one feature start
// quoting different prices.

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { EmptyState } from '@/components/consumer/empty-state'
import { HistoryLocked } from '@/components/consumer/history/HistoryLocked'
import { PassportCard } from '@/components/consumer/passport/PassportCard'
import { PassportActions } from '@/components/consumer/passport/PassportActions'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import type { AttendedShow } from '@/lib/passport/stats'

const COPY = CONSUMER_COPY.passport

export interface PassportContentProps {
  shows: AttendedShow[]
  tokens: Record<string, string>
  handle: string | null
  year: number
  /** The server's verdict from the /v1/history 403. */
  locked: boolean
  scaRegion: boolean
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8">
    {children}
  </main>
)

export const PassportContent = ({
  shows,
  tokens,
  handle,
  year,
  locked,
  scaRegion,
}: PassportContentProps) => {
  const { isLoading, active } = useEntitlement('concert-history')

  // Server 403 wins outright; the client hook decides for a plan the server
  // hasn't rejected — e.g. a token that downgraded mid-session.
  if (locked || (!isLoading && !active)) {
    return (
      <Shell>
        <HistoryLocked scaRegion={scaRegion} />
      </Shell>
    )
  }

  if (shows.length === 0) {
    return (
      <Shell>
        <EmptyState
          state="no-data"
          eyebrow={COPY.emptyEyebrow}
          title={COPY.emptyTitle}
          body={COPY.emptyBody}
          primaryCta={{ label: COPY.emptyCta, href: '/events' }}
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-fg">
          {COPY.pageTitle}
        </h1>
        <p className="text-sm text-fg-muted">{COPY.pageSubtitle}</p>
      </header>

      {/* The compact card is the preview; the PNG route draws the same card at
          1080 from the same component, so the two cannot drift. */}
      <div className="flex flex-col items-center gap-5">
        <PassportCard
          mode="compact"
          shows={shows}
          tokens={tokens}
          handle={handle}
          year={year}
        />
        <PassportActions imageUrl="/passport/square" />
      </div>
    </Shell>
  )
}
