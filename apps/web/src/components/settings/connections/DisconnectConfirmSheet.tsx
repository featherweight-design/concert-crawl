'use client'

// Disconnect confirmation sheet (#763 PR 5) — warm, explicit about what's
// lost and what stays. The third bullet ("Shows you're watching stay") gets
// the signal dot per the handoff mock.

import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { GhostButton } from '@/components/consumer/spotify/SpotifyButtons'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const COPY = SPOTIFY_COPY.disconnectConfirm

interface DisconnectConfirmSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  busy?: boolean
}

export const DisconnectConfirmSheet = ({
  open,
  onClose,
  onConfirm,
  busy = false,
}: DisconnectConfirmSheetProps) => (
  <ModalShell
    open={open}
    onClose={onClose}
    ariaLabel={COPY.ariaLabel}
    sheetHeight="short"
    header={
      <div className="relative inline-block py-1">
        <SpotifyLogo size={40} />
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[12px] font-extrabold"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border-strong)',
            color: 'var(--danger)',
          }}
        >
          ✕
        </span>
      </div>
    }
    footer={
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="w-full cursor-pointer rounded-xl py-[13px] text-center text-[15px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-default disabled:opacity-60"
          style={{
            background: 'color-mix(in oklch, var(--danger) 14%, transparent)',
            border:
              '1px solid color-mix(in oklch, var(--danger) 42%, transparent)',
            color: 'var(--danger)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {COPY.confirmCta}
        </button>
        <GhostButton onClick={onClose} disabled={busy}>
          {COPY.keepCta}
        </GhostButton>
      </div>
    }
  >
    <h2 className="mb-2 text-[22px] font-black leading-[1.15] tracking-[-0.03em] text-fg">
      {COPY.title}
    </h2>
    <p className="mb-4 text-[13.5px] leading-[1.5] text-fg-muted">
      {COPY.body}
    </p>
    <ul className="m-0 flex list-none flex-col gap-[11px] p-0">
      {COPY.bullets.map((bullet, index) => (
        <li key={bullet.head} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full"
            style={{
              background:
                index === COPY.bullets.length - 1
                  ? 'var(--signal)'
                  : 'var(--fg-subtle)',
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="text-[13.5px] font-bold text-fg">
              {bullet.head}{' '}
            </span>
            <span className="text-[13px] text-fg-muted">{bullet.sub}</span>
          </span>
        </li>
      ))}
    </ul>
  </ModalShell>
)
