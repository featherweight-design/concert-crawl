'use client'

// Honesty-rail interstitial shown before the Clerk-managed Spotify OAuth
// redirect (#763 PR 5). "Continue to Spotify" creates the pending external
// account and navigates to Spotify's authorize page; any failure (including
// a Clerk instance without the Spotify provider configured) swaps to the
// "Spotify's not picking up" state — no crash, nothing linked.

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_RETURN_PATH, startSpotifyConnect } from '@/lib/spotify-connect'
import { SPOTIFY_COPY } from './definitions/copy'
import { HonestyRail } from './HonestyRail'
import { NoAnswerGlyph } from './glyphs'
import { StateBody, StateGlyphDisc } from './StateBody'
import { SignalButton, TextButton } from './SpotifyButtons'

const HANDOFF_COPY = SPOTIFY_COPY.oauthHandoff
const FAIL_COPY = SPOTIFY_COPY.failConnectDown

type HandoffPhase = 'rail' | 'starting' | 'error'

interface OAuthHandoffSheetProps {
  open: boolean
  onClose: () => void
}

export const OAuthHandoffSheet = ({
  open,
  onClose,
}: OAuthHandoffSheetProps) => {
  const { user } = useUser()
  const [phase, setPhase] = useState<HandoffPhase>('rail')

  const beginHandoff = async () => {
    if (phase === 'starting') return
    if (!user) {
      setPhase('error')
      return
    }
    setPhase('starting')
    const redirectUrl = `${window.location.origin}${SPOTIFY_RETURN_PATH}`
    const result = await startSpotifyConnect(user, redirectUrl)
    if (result.status === 'redirect') {
      window.location.assign(result.url)
      return
    }
    setPhase('error')
  }

  const close = () => {
    setPhase('rail')
    onClose()
  }

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
      open={open}
      onClose={close}
      ariaLabel={HANDOFF_COPY.ariaLabel}
      header={phase === 'error' ? <div aria-hidden /> : railHeader}
      footer={
        phase === 'error' ? (
          <div className="flex flex-col gap-2.5">
            <SignalButton withLogo onClick={() => setPhase('rail')}>
              {FAIL_COPY.primaryCta}
            </SignalButton>
            <TextButton onClick={close}>{FAIL_COPY.secondaryCta}</TextButton>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <SignalButton
              withLogo
              onClick={() => void beginHandoff()}
              disabled={phase === 'starting'}
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
