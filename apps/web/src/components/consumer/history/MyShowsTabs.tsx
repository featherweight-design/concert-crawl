'use client'

// The "My shows" sub-tab bar — Watching · Concerts (#70, #1357).
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

type MyShowsTab = 'watching' | 'history'

const TABS: readonly { key: MyShowsTab; label: string; href: string }[] = [
  { key: 'watching', label: COPY.watching, href: '/watching' },
  { key: 'history', label: COPY.concerts, href: '/history' },
]

export const MyShowsTabs = ({ active }: { active: MyShowsTab }) => (
  <nav
    aria-label={COPY.ariaLabel}
    className="mb-4 flex gap-1 rounded-[10px] border border-border bg-surface-1 p-[3px] sm:mb-6 sm:gap-2 sm:border-transparent sm:bg-transparent sm:p-0"
  >
    {TABS.map((tab) => {
      const current = tab.key === active
      return (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={current ? 'page' : undefined}
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
        </Link>
      )
    })}
  </nav>
)
