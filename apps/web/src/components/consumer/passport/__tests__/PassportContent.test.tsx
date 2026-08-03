// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { PassportContent } from '../PassportContent'
import { PP_MODES } from '../definitions/modes'
import { ThemeProvider } from '@/theme'
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

// jsdom implements neither half of the object-URL API. Captured so the stubs
// can be put back — Vitest shares a worker across files, so an unrestored
// global outlives this suite.
const objectUrlApi = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) }),
    ),
  )
  URL.createObjectURL = vi.fn(() => 'blob:passport')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  URL.createObjectURL = objectUrlApi.create
  URL.revokeObjectURL = objectUrlApi.revoke
  entitlement.value = { isLoading: false, active: true }
})

const COPY = CONSUMER_COPY.passport

const show = (index: number): AttendedShow => ({
  id: `show-${index}`,
  artist: `Artist ${index}`,
  venue: 'Larimer Lounge',
  genre: 'indie',
  date: '2026-05-14',
  priceFinal: 22,
})

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
    <ThemeProvider>
      <PassportContent
        shows={SHOWS}
        tokens={TOKENS}
        handle="hugh"
        year={2026}
        locked={false}
        scaRegion={false}
        {...props}
      />
    </ThemeProvider>,
  )

describe('PassportContent', () => {
  it('draws the card for an entitled user with stamps', () => {
    renderContent({})

    expect(screen.getByText(COPY.pageTitle)).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
  })

  // The preview used to be the compact 3×3 card while the download was the
  // 4×4 print card, so the reader was shown one wall and handed another.
  it('previews the same card the download contains, not the compact one', () => {
    const wall = PP_MODES.share.cols * PP_MODES.share.rows
    renderContent({
      shows: Array.from({ length: wall }, (_, i) => show(i)),
    })

    expect(screen.getByText(`Artist ${wall - 1}`)).toBeInTheDocument()
  })

  // The card follows the theme the browser is in, not the one last written to
  // the profile — otherwise switching themes leaves the passport behind.
  it('renders the PNG in the theme the reader is currently looking at', async () => {
    renderContent({})

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/passport/square?theme=electric'),
    )
    // Once, not twice: an un-themed first pass would render the card, throw it
    // away when the live theme resolved, and bounce the button back to
    // "Preparing…" in between.
    expect(fetch).toHaveBeenCalledTimes(1)
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
