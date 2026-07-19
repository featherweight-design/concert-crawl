// Honesty rail — the "we never see your password" trust list shown on the
// OAuth handoff interstitial (#763 PR 5). Icons are signal-tinted squares;
// copy comes verbatim from SPOTIFY_COPY.honestyRail.

import { SPOTIFY_COPY } from './definitions/copy'

const ICON_STROKE = 'var(--signal)'

const RAIL_ICONS: Record<string, React.ReactNode> = {
  lock: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="8"
        width="11"
        height="7"
        rx="1.6"
        stroke={ICON_STROKE}
        strokeWidth="1.5"
      />
      <path
        d="M6 8V6a3 3 0 016 0v2"
        stroke={ICON_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M1.5 9S4 4 9 4s7.5 5 7.5 5-2.5 5-7.5 5S1.5 9 1.5 9z"
        stroke={ICON_STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.2" stroke={ICON_STROKE} strokeWidth="1.5" />
    </svg>
  ),
  'broken-link': (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M7.5 10.5l3-3m-1.2-2.3l1-1a2.8 2.8 0 013.9 3.9l-1 1m-6.4 0l-1 1a2.8 2.8 0 003.9 3.9l1-1"
        stroke={ICON_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 3l12 12"
        stroke={ICON_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
}

export const HonestyRail = () => (
  <ul className="m-0 flex list-none flex-col gap-[13px] p-0">
    {SPOTIFY_COPY.honestyRail.map((line) => (
      <li key={line.icon} className="flex items-start gap-[11px]">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'color-mix(in oklch, var(--signal) 12%, transparent)',
            border:
              '1px solid color-mix(in oklch, var(--signal) 26%, transparent)',
          }}
        >
          {RAIL_ICONS[line.icon]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold leading-[1.3] tracking-[-0.01em] text-fg">
            {line.head}
          </span>
          <span className="mt-0.5 block text-[12px] font-medium leading-[1.35] text-fg-muted">
            {line.sub}
          </span>
        </span>
      </li>
    ))}
  </ul>
)
