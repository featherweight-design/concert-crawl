'use client'

// Post-OAuth return orchestrator (#763 PR 5). Mounted once at the settings
// page level (outside the mobile/desktop wrappers — both are in the DOM, so
// mounting inside either would double-fire the POST). When the URL carries
// `spotify=return` it cleans the param, POSTs /v1/spotify/connection exactly
// once (Clerk verification + first sync inline), then routes the result:
//   denverShowCount > 0 → success screen → one-time auto-watch opt-in sheet
//   denverShowCount = 0 → "Denver didn't — yet" empty state
//   POST failure        → "Spotify's not picking up" with retry
// Auto-watch is PATCHed only on the explicit "auto" choice — the highlight
// choice and any dismissal write nothing.

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import {
  useSpotifyConnect,
  useSpotifyPatch,
} from '@/lib/queries/use-spotify-connection'
import { SPOTIFY_COPY } from './definitions/copy'
import { AutoWatchSheet } from './AutoWatchSheet'
import { ConnectSuccessModal } from './ConnectSuccessModal'
import { EmptyDenverMatchModal } from './EmptyDenverMatchModal'
import { NoAnswerGlyph } from './glyphs'
import { StateBody, StateGlyphDisc } from './StateBody'
import { SignalButton, TextButton } from './SpotifyButtons'

const PENDING_COPY = SPOTIFY_COPY.connectPending
const FAIL_COPY = SPOTIFY_COPY.failConnectDown

const RETURN_PARAM = 'spotify'
const RETURN_VALUE = 'return'
const CLEAN_PATH = '/me?section=connections'
const BROWSE_PATH = '/events'

type FlowPhase =
  'idle' | 'connecting' | 'success' | 'autowatch' | 'empty' | 'failed'

export const SpotifyReturnFlow = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const connect = useSpotifyConnect()
  const patch = useSpotifyPatch()
  const [phase, setPhase] = useState<FlowPhase>('idle')
  const startedRef = useRef(false)

  const runConnect = () => {
    connect.mutate(undefined, {
      // Functional updates so a user dismissal mid-flight stays dismissed.
      onSuccess: (view) => {
        setPhase((current) =>
          current === 'connecting'
            ? view.denverShowCount > 0
              ? 'success'
              : 'empty'
            : current,
        )
      },
      onError: () => {
        setPhase((current) => (current === 'connecting' ? 'failed' : current))
      },
    })
  }

  // Stable across renders: `connect.mutate` identity is stable in
  // react-query, and the ref guarantees single-fire under StrictMode.
  const runConnectRef = useRef(runConnect)
  runConnectRef.current = runConnect

  useEffect(() => {
    if (startedRef.current) return
    if (searchParams.get(RETURN_PARAM) !== RETURN_VALUE) return
    startedRef.current = true
    router.replace(CLEAN_PATH, { scroll: false })
    setPhase('connecting')
    runConnectRef.current()
  }, [searchParams, router])

  const goBrowse = () => {
    setPhase('idle')
    router.push(BROWSE_PATH)
  }

  const watchAndBrowse = () => {
    patch.mutate({ autoWatch: true })
    goBrowse()
  }

  const view = connect.data

  return (
    <>
      {/* In-flight: the POST runs the first sync inline (a few seconds). */}
      <ModalShell
        open={phase === 'connecting'}
        onClose={() => setPhase('idle')}
        ariaLabel={PENDING_COPY.ariaLabel}
        header={<div aria-hidden />}
      >
        <StateBody
          glyph={
            <StateGlyphDisc tone="signal">
              <span
                aria-hidden
                className="inline-block h-7 w-7 animate-spin rounded-full"
                style={{
                  border:
                    '3px solid color-mix(in oklch, var(--signal) 30%, transparent)',
                  borderTopColor: 'var(--signal)',
                }}
              />
            </StateGlyphDisc>
          }
          eyebrow={PENDING_COPY.eyebrow}
          eyebrowTone="signal"
          title={PENDING_COPY.title}
          body={PENDING_COPY.body}
        />
      </ModalShell>

      {view && (
        <ConnectSuccessModal
          open={phase === 'success'}
          connection={view}
          onContinue={() => setPhase('autowatch')}
          onClose={() => setPhase('idle')}
        />
      )}

      {view && (
        <AutoWatchSheet
          open={phase === 'autowatch'}
          denverArtistCount={view.denverArtistCount}
          denverShowCount={view.denverShowCount}
          onConfirm={(choice) => {
            if (choice === 'auto') watchAndBrowse()
            else goBrowse()
          }}
          onClose={() => setPhase('idle')}
        />
      )}

      {view && (
        <EmptyDenverMatchModal
          open={phase === 'empty'}
          artistCount={view.artistCount}
          onWatch={watchAndBrowse}
          onBrowse={goBrowse}
          onClose={() => setPhase('idle')}
        />
      )}

      {/* Connect POST failed — nothing was linked server-side. */}
      <ModalShell
        open={phase === 'failed'}
        onClose={() => setPhase('idle')}
        ariaLabel={FAIL_COPY.ariaLabel}
        header={<div aria-hidden />}
        footer={
          <div className="flex flex-col gap-2.5">
            <SignalButton
              withLogo
              onClick={() => {
                setPhase('connecting')
                runConnect()
              }}
            >
              {FAIL_COPY.primaryCta}
            </SignalButton>
            <TextButton onClick={() => setPhase('idle')}>
              {FAIL_COPY.secondaryCta}
            </TextButton>
          </div>
        }
      >
        <StateBody
          glyph={
            <StateGlyphDisc tone="muted">
              <NoAnswerGlyph />
            </StateGlyphDisc>
          }
          eyebrow={FAIL_COPY.eyebrow}
          eyebrowTone="muted"
          title={FAIL_COPY.title}
          body={FAIL_COPY.body}
        />
      </ModalShell>
    </>
  )
}
