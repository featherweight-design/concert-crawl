'use client'

// The "My shows" sub-tab bar — Watching · Concerts · Artists (#70, #1357, and
// native following PR 6).
//
// The tab key and the href stay `history`; only the label moved. The route, the
// entitlement key and the API path all carry `history`, and the tense now lives
// in the Upcoming/Past section headers rather than in the tab name.
//
// One responsive component, not a mobile/desktop pair: the handoff draws them
// separately (history-screens.jsx:329 segmented pill, history-routes.jsx:406
// wider bordered tabs) purely for canvas storyboarding.
//
// These are navigations, not tab panels, so they're links carrying
// aria-current="page" rather than role="tab" buttons — there is no panel to
// associate and no in-place switching.

import Link from 'next/link'
import { HISTORY_COPY } from './definitions/copy'

const COPY = HISTORY_COPY.tabs

export type MyShowsTab = 'watching' | 'history' | 'artists'

// The Artists route is `/following`, deliberately NOT `/artists`: middleware
// lists `/artists(.*)` under isPublicOnceLaunched, so an artists index would
// go public at launch, and the nav's prefix matcher would light "My shows" on
// every public artist page. `/following` is in neither matcher.
const TABS: readonly { key: MyShowsTab; label: string; href: string }[] = [
  { key: 'watching', label: COPY.watching, href: '/watching' },
  { key: 'history', label: COPY.concerts, href: '/history' },
  { key: 'artists', label: COPY.artists, href: '/following' },
]

interface MyShowsTabsProps {
  active: MyShowsTab
  /**
   * Follows the viewer has. Rendered on the Artists tab only while it is the
   * active one (the prototype's active-only count rule), and omitted entirely
   * at zero — nought is not a number worth announcing.
   */
  artistCount?: number
}

export const MyShowsTabs = ({ active, artistCount }: MyShowsTabsProps) => (
  <nav
    aria-label={COPY.ariaLabel}
    className="mb-4 flex gap-1 rounded-[10px] border border-border bg-surface-1 p-[3px] sm:mb-6 sm:gap-2 sm:border-transparent sm:bg-transparent sm:p-0"
  >
    {TABS.map((tab) => {
      const current = tab.key === active
      const count =
        tab.key === 'artists' &&
        current &&
        artistCount !== undefined &&
        artistCount > 0
          ? artistCount
          : null
      return (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={current ? 'page' : undefined}
          aria-label={
            count === null ? undefined : COPY.tabCountAria(tab.label, count)
          }
          className="my-shows-tab inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md px-3.5 sm:flex-none sm:justify-start sm:gap-2 sm:rounded-[9px] sm:px-4"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            fontWeight: current ? 700 : 500,
            letterSpacing: '-0.005em',
            textDecoration: 'none',
            color: current ? 'var(--fg)' : 'var(--fg-muted)',
            background: current ? 'var(--surface-3)' : 'transparent',
            border: `1px solid ${current ? 'var(--border-strong)' : 'transparent'}`,
          }}
        >
          {/* No tier chip: a subscriber shouldn't be sold the plan they're on,
              and HistoryLocked is where an unentitled user meets the price. */}
          <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
          {count !== null && (
            <span
              aria-hidden
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--fg-subtle)',
              }}
            >
              {count}
            </span>
          )}
        </Link>
      )
    })}
  </nav>
)
