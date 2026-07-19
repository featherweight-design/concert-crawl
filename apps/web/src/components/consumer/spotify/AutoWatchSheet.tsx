'use client'

// One-time auto-watch opt-in sheet, shown after the connect success screen
// (#763 PR 5, connect-flow.jsx mock). Two explicit choices — auto-watch vs
// highlight-only (the default). Dismissing writes nothing; only confirming
// the "auto" choice ever flips the preference.

import { useState } from 'react'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from './definitions/copy'
import { SignalButton } from './SpotifyButtons'

const COPY = SPOTIFY_COPY.autoWatchSheet

export type AutoWatchChoice = 'auto' | 'highlight'

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path
      d="M9 2.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L9 12.3 5.3 14.3l.7-4.3-3.1-3 4.3-.6L9 2.5z"
      fill="currentColor"
    />
  </svg>
)

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path
      d="M4 9.5s2-4.5 5-4.5 5 4.5 5 4.5-2 4.5-5 4.5-5-4.5-5-4.5z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="9" cy="9.5" r="1.8" fill="currentColor" />
  </svg>
)

const OptionCard = ({
  selected,
  onSelect,
  icon,
  title,
  body,
  defaultPill,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  body: string
  defaultPill?: string
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className="flex w-full cursor-pointer items-start gap-3 rounded-[14px] p-[15px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    style={{
      background: selected
        ? 'color-mix(in oklch, var(--signal) 10%, var(--surface-1))'
        : 'var(--surface-1)',
      border: selected
        ? '1.5px solid var(--signal)'
        : '1px solid var(--border)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    <span
      aria-hidden
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
      style={{
        background: selected ? 'var(--signal)' : 'var(--surface-3)',
        color: selected ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
      }}
    >
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-[15px] font-extrabold tracking-[-0.01em] text-fg">
          {title}
        </span>
        {defaultPill && (
          <span
            className="rounded border border-border-strong px-[5px] py-0.5 text-[8px] font-bold tracking-[0.1em] text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {defaultPill}
          </span>
        )}
      </span>
      <span className="mt-1 block text-[12.5px] leading-[1.4] text-fg-muted">
        {body}
      </span>
    </span>
    <span
      aria-hidden
      className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
      style={{
        border: selected
          ? '6px solid var(--signal)'
          : '2px solid var(--border-strong)',
        background: selected ? 'var(--bg)' : 'transparent',
        boxSizing: 'border-box',
      }}
    />
  </button>
)

interface AutoWatchSheetProps {
  open: boolean
  denverArtistCount: number
  denverShowCount: number
  onConfirm: (choice: AutoWatchChoice) => void
  onClose: () => void
}

export const AutoWatchSheet = ({
  open,
  denverArtistCount,
  denverShowCount,
  onConfirm,
  onClose,
}: AutoWatchSheetProps) => {
  // Highlight-only is the designed default; auto is the explicit opt-in.
  const [choice, setChoice] = useState<AutoWatchChoice>('highlight')

  const eyebrow =
    denverArtistCount === 1
      ? COPY.eyebrowSingular
      : COPY.eyebrow(denverArtistCount)
  const cta =
    choice === 'auto'
      ? denverShowCount === 1
        ? COPY.ctaAutoSingular
        : COPY.ctaAuto(denverShowCount)
      : COPY.ctaHighlight

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.ariaLabel}
      header={
        <div className="flex items-center gap-2 py-1">
          <SpotifyLogo size={24} />
          <span
            className="text-[9px] font-bold uppercase tracking-[0.14em] text-signal"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {eyebrow}
          </span>
          <button
            type="button"
            aria-label={COPY.dismissAria}
            onClick={onClose}
            className="ml-auto cursor-pointer rounded p-1 text-[16px] leading-none text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            ✕
          </button>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2.5">
          <SignalButton onClick={() => onConfirm(choice)}>{cta}</SignalButton>
          <span
            className="text-center text-[9px] font-bold uppercase tracking-[0.08em] text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {COPY.footer}
          </span>
        </div>
      }
    >
      <div className="flex flex-col">
        <h2 className="text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-fg">
          {COPY.title}
        </h2>
        <p className="mb-[18px] mt-1.5 text-[13.5px] leading-[1.45] text-fg-muted">
          {COPY.body}
        </p>
        <div
          role="radiogroup"
          aria-label={COPY.ariaLabel}
          className="flex flex-col gap-2.5"
        >
          <OptionCard
            selected={choice === 'auto'}
            onSelect={() => setChoice('auto')}
            icon={<StarIcon />}
            title={COPY.optionAuto.head}
            body={COPY.optionAuto.sub(denverShowCount)}
          />
          <OptionCard
            selected={choice === 'highlight'}
            onSelect={() => setChoice('highlight')}
            icon={<EyeIcon />}
            title={COPY.optionHighlight.head}
            body={COPY.optionHighlight.sub}
            defaultPill={COPY.optionHighlight.defaultPill}
          />
        </div>
      </div>
    </ModalShell>
  )
}
