'use client'

// The /passport route body (#85).
//
// The Passport is drawn from Concert History, so it is gated on the same
// entitlement and locked by the same component — a second lock screen saying
// the same thing in different words is how two surfaces of one feature start
// quoting different prices.

import { useCallback, useEffect, useRef, useState } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { EmptyState } from '@/components/consumer/empty-state'
import { HistoryLocked } from '@/components/consumer/history/HistoryLocked'
import { PassportCard } from '@/components/consumer/passport/PassportCard'
import { PassportActions } from '@/components/consumer/passport/PassportActions'
import {
  PP_MODES,
  PASSPORT_PRINT_MODE,
} from '@/components/consumer/passport/definitions/modes'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { resolveThemeTokens } from '@/lib/share/theme-tokens'
import { useTheme } from '@/theme'
import type { AttendedShow } from '@/lib/passport/stats'

const COPY = CONSUMER_COPY.passport

/** How wide the preview is allowed to get. The card is square. */
const PREVIEW_MAX_WIDTH = 420

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
  const { theme } = useTheme()

  // The server draws the card in the theme stored on the profile; the browser
  // may be sitting in a different one, and the theme the reader can see is the
  // one the card has to match. Deferred to after mount because swapping tokens
  // during hydration would fight the server's markup.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const liveTokens = mounted ? resolveThemeTokens(theme).tokens : tokens
  const imageUrl = mounted
    ? `/passport/square?theme=${encodeURIComponent(theme)}`
    : '/passport/square'

  // The preview is the print card itself, scaled down — not the compact mode.
  // A preview that is a different card is how the reader is shown a 3×3 wall
  // and handed a 4×4 one.
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_MAX_WIDTH)
  const observerRef = useRef<ResizeObserver | null>(null)
  const measureFrame = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (node === null) return
    const measured = node.getBoundingClientRect().width
    if (measured > 0) setPreviewWidth(measured)
    // The first measurement is what the preview actually needs; tracking later
    // resizes is an enhancement, so a runtime without ResizeObserver renders
    // rather than throws.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width !== undefined && width > 0) setPreviewWidth(width)
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])
  useEffect(
    () => () => {
      observerRef.current?.disconnect()
    },
    [],
  )
  const previewScale = previewWidth / PP_MODES[PASSPORT_PRINT_MODE].width

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

      <div className="flex flex-col items-center gap-5">
        <div
          ref={measureFrame}
          className="w-full"
          style={{ maxWidth: PREVIEW_MAX_WIDTH }}
        >
          <div
            className="relative overflow-hidden"
            style={{ width: '100%', height: previewWidth }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transformOrigin: 'top left',
                transform: `scale(${previewScale})`,
              }}
            >
              <PassportCard
                mode={PASSPORT_PRINT_MODE}
                shows={shows}
                tokens={liveTokens}
                handle={handle}
                year={year}
              />
            </div>
          </div>
        </div>
        <PassportActions imageUrl={imageUrl} />
      </div>
    </Shell>
  )
}
