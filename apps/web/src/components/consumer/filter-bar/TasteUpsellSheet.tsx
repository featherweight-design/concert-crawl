'use client'

// Free-tier upsell for the taste filter chip (#763 PR 7, taste-filter.jsx
// mock). Opens when a free/supporter viewer taps the locked "Following"
// chip; "See plans" hands off to the tier picker (paywall entry).

import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'
import { SignalButton } from '@/components/consumer/spotify/SpotifyButtons'

const COPY = SPOTIFY_COPY.tasteFilter.upsell

interface TasteUpsellSheetProps {
  open: boolean
  onClose: () => void
  onSeePlans: () => void
}

export const TasteUpsellSheet = ({
  open,
  onClose,
  onSeePlans,
}: TasteUpsellSheetProps) => (
  <ModalShell
    open={open}
    onClose={onClose}
    ariaLabel={COPY.ariaLabel}
    sheetHeight="short"
    header={
      <div className="flex items-center gap-2 py-1">
        <SpotifyLogo size={24} />
        <span
          className="text-[9px] font-bold uppercase tracking-[0.14em] text-signal"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {COPY.eyebrow}
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
        <SignalButton onClick={onSeePlans}>{COPY.cta}</SignalButton>
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
      <h2 className="text-[23px] font-black leading-[1.15] tracking-[-0.03em] text-fg">
        {COPY.title}
      </h2>
      <p className="mb-4 mt-2 text-[13.5px] leading-[1.45] text-fg-muted">
        {COPY.bodyBeforeBold}
        <b className="text-fg">{COPY.bodyBold}</b>
        {COPY.bodyAfterBold}
      </p>
      <ul className="mb-2 flex list-none flex-col gap-[9px] p-0">
        {COPY.bullets.map((bullet) => (
          <li key={bullet.head} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full"
              style={{ background: 'var(--signal)' }}
            />
            <span>
              <span className="text-[13.5px] font-bold text-fg">
                {bullet.head}{' '}
              </span>
              <span className="text-[13px] text-fg-muted">— {bullet.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  </ModalShell>
)
