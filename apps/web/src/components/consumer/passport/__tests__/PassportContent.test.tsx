// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { PassportContent } from '../PassportContent'
import type { AttendedShow } from '@/lib/passport/stats'

const entitlement = vi.hoisted(() => ({
  value: { isLoading: false, active: true },
}))

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement.value,
}))

// The locked state reaches for the plan through Clerk; the upgrade path itself
// belongs to HistoryLocked's own suite, so here it only has to render.
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('tok') }),
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}))

afterEach(() => {
  cleanup()
  entitlement.value = { isLoading: false, active: true }
})

const COPY = CONSUMER_COPY.passport

const SHOWS: AttendedShow[] = [
  {
    id: 'a',
    artist: 'Wednesday',
    venue: 'Larimer Lounge',
    genre: 'indie',
    date: '2026-05-14',
    priceFinal: 22,
  },
]

const TOKENS = { '--bg': '#000', '--fg': '#fff', '--accent': '#0ff' }

const renderContent = (props: Partial<Parameters<typeof PassportContent>[0]>) =>
  render(
    <PassportContent
      shows={SHOWS}
      tokens={TOKENS}
      handle="hugh"
      year={2026}
      locked={false}
      scaRegion={false}
      {...props}
    />,
  )

describe('PassportContent', () => {
  it('draws the card for an entitled user with stamps', () => {
    renderContent({})

    expect(screen.getByText(COPY.pageTitle)).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
  })

  // The server's 403 is the authoritative verdict — a client hook that still
  // reports `active` must not be able to paint the card behind it.
  it('locks on the server 403 even when the client thinks it is entitled', () => {
    renderContent({ locked: true })

    expect(screen.queryByText(COPY.pageTitle)).not.toBeInTheDocument()
  })

  // The other direction: a token that downgraded mid-session leaves the server
  // fetch un-403'd while the plan no longer covers the feature.
  it('locks when the client entitlement has lapsed', () => {
    entitlement.value = { isLoading: false, active: false }
    renderContent({})

    expect(screen.queryByText(COPY.pageTitle)).not.toBeInTheDocument()
  })

  // Not a locked state: the plan is fine, the stamp book is simply empty.
  it('shows the empty state rather than a blank card when nothing is attended', () => {
    renderContent({ shows: [] })

    expect(screen.getByText(COPY.emptyTitle)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: COPY.emptyCta })).toHaveAttribute(
      'href',
      '/events',
    )
  })

  // A resolving plan must not flash the lock screen at a Supporter.
  it('does not lock while the entitlement is still resolving', () => {
    entitlement.value = { isLoading: true, active: false }
    renderContent({})

    expect(screen.getByText(COPY.pageTitle)).toBeInTheDocument()
  })
})
