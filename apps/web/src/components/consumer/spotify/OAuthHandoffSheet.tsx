'use client'

// Honesty-rail interstitial shown before the Clerk-managed Spotify OAuth
// redirect (#763 PR 5). "Continue to Spotify" creates the pending external
// account and navigates to Spotify's authorize page; any failure (including
// a Clerk instance without the Spotify provider configured) swaps to the
// "Spotify's not picking up" state — no crash, nothing linked.

import { useEffect, useRef, useState } from 'react'
import { useReverification, useUser } from '@clerk/nextjs'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import {
  clearSpotifyConnectPending,
  consumeSpotifyConnectPending,
  markSpotifyConnectPending,
  SPOTIFY_RETURN_PATH,
  startSpotifyConnect,
  type SpotifyExternalAccountParams,
} from '@/lib/spotify-connect'
import { SPOTIFY_COPY } from './definitions/copy'
import { HonestyRail } from './HonestyRail'
import { NoAnswerGlyph } from './glyphs'
import { StateBody, StateGlyphDisc } from './StateBody'
import { SignalButton, TextButton } from './SpotifyButtons'

const HANDOFF_COPY = SPOTIFY_COPY.oauthHandoff
const FAIL_COPY = SPOTIFY_COPY.failConnectDown

type HandoffPhase = 'rail' | 'error'

interface OAuthHandoffSheetProps {
  open: boolean
  onClose: () => void
}

export const OAuthHandoffSheet = ({
  open,
  onClose,
}: OAuthHandoffSheetProps) => {
  const { enabled: spotifyEnabled } = useFeatureFlag('spotify-sync')
  const { user } = useUser()
  // Clerk treats createExternalAccount as a sensitive op — on instances with
  // reverification enabled, aged sessions 403 unless the enhanced fetcher
  // shows Clerk's re-auth modal and retries (#763 staging feedback).
  const createSpotifyAccount = useReverification(
    (params: SpotifyExternalAccountParams) => {
      if (!user) {
        return Promise.reject(new Error('spotify connect: no signed-in user'))
      }
      return user.createExternalAccount(params)
    },
  )
  const [phase, setPhase] = useState<HandoffPhase>('rail')
  // `starting` is tracked apart from the phase so "Try again" can retry from
  // the error state without flashing back to the rail.
  const [starting, setStarting] = useState(false)
  // Set when a reload interrupted the connect mid-reverification — the sheet
  // then reopens itself even though the parent's open state was reset.
  const [resuming, setResuming] = useState(false)
  // Dismissing while startSpotifyConnect is in flight must not redirect the
  // user to Spotify once the promise settles — cancel wins.
  const cancelledRef = useRef(false)

  const beginHandoff = async () => {
    if (starting) return
    cancelledRef.current = false
    setStarting(true)
    const redirectUrl = `${window.location.origin}${SPOTIFY_RETURN_PATH}`
    // Clerk's reverification flow can reload the page after the user completes
    // an email/OTP factor, orphaning this promise — mark intent first so the
    // remounted sheet resumes the connect (#763 staging feedback).
    markSpotifyConnectPending()
    const result = await startSpotifyConnect(createSpotifyAccount, redirectUrl)
    // Settled without a reload — clear before any navigation so the Spotify
    // return trip (or a cancel/error) never re-fires the connect.
    clearSpotifyConnectPending()
    if (cancelledRef.current) return
    if (result.status === 'redirect') {
      // Leave `starting` set — the button stays disabled until navigation.
      window.location.assign(result.url)
      return
    }
    setStarting(false)
    // Backing out of Clerk's reverification modal is a choice, not a failure.
    setPhase(result.status === 'cancelled' ? 'rail' : 'error')
  }

  // Pick a reload-interrupted connect back up once Clerk has the user again;
  // the freshly verified session goes straight to Spotify's authorize page.
  // Checked at most once per mount — Clerk hands out a fresh user object on
  // re-renders, and a re-fired consume would eat the mark mid-flight.
  const resumeCheckedRef = useRef(false)
  useEffect(() => {
    if (!user || resumeCheckedRef.current) return
    resumeCheckedRef.current = true
    if (!consumeSpotifyConnectPending()) return
    setResuming(true)
    void beginHandoff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const close = () => {
    cancelledRef.current = true
    // Cancel wins even across a reverification reload — a lingering mark
    // would auto-resume a connect the user explicitly dismissed.
    clearSpotifyConnectPending()
    setPhase('rail')
    setStarting(false)
    setResuming(false)
    onClose()
  }

  // Below every hook, so a late-landing flag read cannot change the hook
  // count. Defence in depth: every render site is gated already, but this
  // sheet is the door to the OAuth redirect and must never open behind it.
  if (!spotifyEnabled) return null

  const railHeader = (
    <div className="flex items-center justify-center gap-3.5 py-1.5">
      <CCClusterMark size={40} color="var(--signal)" />
      <span aria-hidden className="flex items-center gap-1">
        {[0.4, 0.65, 0.9].map((opacity) => (
          <span
            key={opacity}
            className="h-[5px] w-[5px] rounded-full"
            style={{ background: 'var(--signal)', opacity }}
          />
        ))}
      </span>
      <SpotifyLogo size={40} />
    </div>
  )

  return (
    <ModalShell
      open={open || resuming}
      onClose={close}
      ariaLabel={HANDOFF_COPY.ariaLabel}
      {...(phase === 'error' ? {} : { header: railHeader })}
      footer={
        phase === 'error' ? (
          <div className="flex flex-col gap-2.5">
            <SignalButton
              withLogo
              onClick={() => void beginHandoff()}
              disabled={starting}
            >
              {FAIL_COPY.primaryCta}
            </SignalButton>
            <TextButton onClick={close}>{FAIL_COPY.secondaryCta}</TextButton>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <SignalButton
              withLogo
              onClick={() => void beginHandoff()}
              disabled={starting}
            >
              {HANDOFF_COPY.continueCta}
            </SignalButton>
            <TextButton onClick={close}>{HANDOFF_COPY.cancelCta}</TextButton>
          </div>
        )
      }
    >
      {phase === 'error' ? (
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
      ) : (
        <div className="flex flex-col">
          <div className="text-center">
            <span
              className="inline-flex items-center gap-[7px] text-[10px] font-bold uppercase tracking-[0.16em] text-signal"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span
                aria-hidden
                className="h-[5px] w-[5px] rounded-full bg-signal"
              />
              {HANDOFF_COPY.eyebrow}
            </span>
          </div>
          <h2 className="mx-auto mt-2 max-w-[320px] text-center text-[25px] font-black leading-[1.15] tracking-[-0.03em] text-fg">
            {HANDOFF_COPY.title}
          </h2>
          <p className="mx-auto mb-[22px] mt-2 max-w-[320px] text-center text-[13.5px] leading-[1.45] text-fg-muted">
            {HANDOFF_COPY.body}
          </p>
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <HonestyRail />
          </div>
        </div>
      )}
    </ModalShell>
  )
}
