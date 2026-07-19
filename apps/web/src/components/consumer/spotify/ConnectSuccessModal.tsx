'use client'

// Post-connect success screen (#763 PR 5, connect-flow.jsx mock) — "here's
// what you told Spotify you love": check disc, artist/Denver counts, a strip
// of recognized-artist chips and the "See my Denver shows" CTA.

import type { SpotifyConnectionView } from '@concert-crawl/types'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { SPOTIFY_COPY } from './definitions/copy'
import { SignalButton } from './SpotifyButtons'

const COPY = SPOTIFY_COPY.connectSuccess

const CHIPS_SHOWN = 6

// Deterministic hue per artist name for the chip avatar gradient (the mock
// hand-assigns hues; real data only has names).
const chipHue = (name: string) => {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

const SyncStat = ({
  value,
  label,
  tone = 'default',
}: {
  value: string
  label: string
  tone?: 'default' | 'signal'
}) => (
  <div className="flex flex-col items-center gap-1">
    <span
      className="text-[20px] font-black tracking-[-0.02em]"
      style={{ color: tone === 'signal' ? 'var(--signal)' : 'var(--fg)' }}
    >
      {value}
    </span>
    <span
      className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {label}
    </span>
  </div>
)

const ArtistChip = ({ name }: { name: string }) => {
  const hue = chipHue(name)
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border border-border bg-surface-2 py-[5px] pl-[6px] pr-3">
      <span
        aria-hidden
        className="h-5 w-5 rounded-full"
        style={{
          background: `linear-gradient(135deg, oklch(0.55 0.12 ${hue}), oklch(0.35 0.1 ${(hue + 40) % 360}))`,
        }}
      />
      <span className="text-[12px] font-semibold text-fg">{name}</span>
    </span>
  )
}

const CheckDisc = () => (
  <div
    className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px]"
    style={{
      background: 'var(--signal)',
      boxShadow:
        '0 8px 30px color-mix(in oklch, var(--signal) 40%, transparent)',
    }}
  >
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <path
        d="M9 17.5l5.5 5.5L25 11"
        stroke="var(--fg-on-accent)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
)

interface ConnectSuccessModalProps {
  open: boolean
  connection: SpotifyConnectionView
  onContinue: () => void
  onClose: () => void
}

export const ConnectSuccessModal = ({
  open,
  connection,
  onContinue,
  onClose,
}: ConnectSuccessModalProps) => {
  const chips = connection.matchedArtists.slice(0, CHIPS_SHOWN)
  const moreCount = connection.artistCount - chips.length

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.ariaLabel}
      header={<div aria-hidden />}
      footer={<SignalButton onClick={onContinue}>{COPY.cta}</SignalButton>}
    >
      <div className="flex flex-col">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <CheckDisc />
          </div>
          <span
            className="inline-flex items-center gap-[7px] text-[10px] font-bold uppercase tracking-[0.16em] text-signal"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span
              aria-hidden
              className="h-[5px] w-[5px] rounded-full bg-signal"
            />
            {COPY.eyebrow}
          </span>
          <h2 className="mt-2 text-[26px] font-black leading-[1.12] tracking-[-0.03em] text-fg">
            {COPY.title}
          </h2>
          <p className="mt-2 max-w-[320px] text-[13.5px] leading-[1.45] text-fg-muted">
            {COPY.bodyBeforeArtists}
            <b className="font-bold text-fg">
              {connection.artistCount}
              {COPY.bodyArtistsSuffix}
            </b>
            {COPY.bodyBetween}
            <b className="font-bold text-fg">{connection.denverArtistCount}</b>
            {COPY.bodyAfterDenver}
          </p>
        </div>

        {/* Stat strip */}
        <div className="mb-4 mt-5 flex justify-around gap-2 rounded-[14px] border border-border bg-surface-1 px-2 py-3.5">
          <SyncStat
            value={`${connection.artistCount}`}
            label={COPY.statArtists}
          />
          <div aria-hidden className="w-px bg-border" />
          <SyncStat
            value={`${connection.denverArtistCount}`}
            label={COPY.statDenver}
            tone="signal"
          />
          <div aria-hidden className="w-px bg-border" />
          <SyncStat value={COPY.statSyncedValue} label={COPY.statSynced} />
        </div>

        {/* Recognized-artist chips */}
        {chips.length > 0 && (
          <>
            <span
              className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-fg-subtle"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {COPY.recognizedLabel}
            </span>
            <div className="flex flex-wrap gap-2">
              {chips.map((name) => (
                <ArtistChip key={name} name={name} />
              ))}
              {moreCount > 0 && (
                <span
                  className="inline-flex items-center rounded-full bg-surface-2 px-3 py-[6px] text-[11px] text-fg-muted"
                  style={{
                    border: '1px dashed var(--border-strong)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {COPY.moreChip(moreCount)}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}
