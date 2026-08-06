'use client'

// The /crews destination. It owns all four states so the header, the list and
// the create affordance can never disagree about which one is showing.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CrewSummary } from '@concert-crawl/types'

import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport'
import { EmptyState } from '@/components/consumer/empty-state'
import { CrewRow } from './CrewRow'
import { CrewRowSkeleton, ShimmerKeyframes } from './CrewRowSkeleton'
import { CreateCrewButton } from './CreateCrewButton'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

export type CrewsState = 'ready' | 'loading' | 'empty' | 'error'

interface CrewsContentProps {
  /** `null` means the server load failed; the page paints the error state. */
  initialCrews: CrewSummary[] | null
  scaRegion: boolean
  /** Only the route-level skeleton passes this; the page itself never does. */
  loading?: boolean
}

const PageHeader = ({
  wide,
  children,
}: {
  wide: boolean
  children?: React.ReactNode
}) => (
  <header className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.list.eyebrow}
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: wide ? 30 : 26,
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: 'var(--fg)',
          }}
        >
          {COPY.list.title}
        </h1>
      </div>
      {children}
    </div>
    <p
      style={{
        margin: 0,
        maxWidth: 460,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--fg-muted)',
      }}
    >
      {COPY.list.subtitle}
    </p>
  </header>
)

export const CrewsContent = ({
  initialCrews,
  scaRegion,
  loading = false,
}: CrewsContentProps) => {
  const router = useRouter()
  const wide = !useIsMobileViewport()
  const [crews, setCrews] = useState<CrewSummary[]>(initialCrews ?? [])

  const state: CrewsState = loading
    ? 'loading'
    : initialCrews === null
      ? 'error'
      : crews.length === 0
        ? 'empty'
        : 'ready'

  // A newly made crew lands at the top rather than waiting on a refetch: the
  // customer just named it, and an empty list a beat after creating one reads
  // as a failure.
  const onCreated = (crew: CrewSummary) => setCrews((prev) => [crew, ...prev])

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-10 pt-5">
      <PageHeader wide={wide}>
        {/* Hidden in loading and error: there is nothing to add to yet. */}
        {(state === 'ready' || state === 'empty') && (
          <CreateCrewButton
            variant="header"
            scaRegion={scaRegion}
            onCreated={onCreated}
          />
        )}
      </PageHeader>

      {state === 'loading' && (
        <>
          <ShimmerKeyframes />
          <span aria-live="polite" className="sr-only">
            {COPY.net.loading}
          </span>
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: wide ? '1fr 1fr' : '1fr',
            }}
          >
            {[0, 1, 2, 3].map((key) => (
              <CrewRowSkeleton key={key} wide={wide} />
            ))}
          </div>
        </>
      )}

      {state === 'ready' && (
        <div
          className="grid gap-2.5"
          style={{ gridTemplateColumns: wide ? '1fr 1fr' : '1fr' }}
        >
          {crews.map((crew) => (
            <CrewRow key={crew.id} crew={crew} wide={wide} />
          ))}
        </div>
      )}

      {state === 'empty' && (
        <div className="flex flex-col items-center gap-3">
          {/* EmptyState's primaryCta is a link; the create affordance is a
              gated button, so it is mounted beneath rather than passed in. */}
          <EmptyState
            state="no-data"
            density="dense"
            eyebrow={COPY.empty.eyebrow}
            title={COPY.empty.title}
            body={COPY.empty.body}
          />
          <CreateCrewButton
            variant="empty"
            scaRegion={scaRegion}
            onCreated={onCreated}
          />
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <EmptyState
            state="error"
            density="dense"
            eyebrow={COPY.net.errEyebrow}
            title={COPY.net.errTitle}
            body={COPY.net.errBody}
          />
          <button
            type="button"
            onClick={() => router.refresh()}
            className="cursor-pointer"
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 999,
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              border: 'none',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {COPY.net.retry}
          </button>
        </div>
      )}
    </div>
  )
}
