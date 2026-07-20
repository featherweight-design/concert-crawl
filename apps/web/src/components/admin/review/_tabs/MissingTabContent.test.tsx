// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MissingTabContent } from './MissingTabContent'
import { type MissingRowEvent } from '../missing/MissingRow'

const NOW = '2026-06-16T03:00:00Z'

const SAMPLE: MissingRowEvent[] = [
  {
    id: 'evt-1',
    title: 'Lord Huron',
    venueName: 'Mission Ballroom',
    date: '2026-06-19',
    showTime: '20:00',
    lastSeenAt: '2026-06-12T03:00:00Z',
    firstMissingAt: '2026-06-13T03:00:00Z',
    classification: 'crawl_gap',
    clusterCount: 1,
  },
]

describe('MissingTabContent', () => {
  it('renders the desktop table when isDesktop=true', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('Lord Huron')).toBeTruthy()
    expect(screen.getByText('Missing from crawl')).toBeTruthy()
  })

  it('renders the mobile card list when isDesktop=false', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop={false}
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('Lord Huron')).toBeTruthy()
    // Mobile banner content differs from desktop:
    expect(
      screen.getByText(/Expected in a daily sweep but not found/),
    ).toBeTruthy()
  })

  it('disables the action buttons while a dismiss is pending', async () => {
    let resolveDismiss: () => void = () => {}
    const onDismiss = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDismiss = resolve
        }),
    )
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledWith('evt-1')
    })
    expect(
      screen.getByRole('button', { name: /Dismiss/ }).hasAttribute('disabled'),
    ).toBe(true)
    resolveDismiss()
  })

  it('renders a loading skeleton — not the empty state — when loading=true', () => {
    render(
      <MissingTabContent
        events={[]}
        isDesktop
        nowIso={NOW}
        loading
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByLabelText('Loading missing events')).toBeTruthy()
    // The empty heading must NOT render during loading — that's the flash bug.
    expect(screen.queryByText("Nothing's gone missing.")).toBeNull()
  })

  it('renders the empty state when loading=false and events is empty', () => {
    render(
      <MissingTabContent
        events={[]}
        isDesktop
        nowIso={NOW}
        loading={false}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText("Nothing's gone missing.")).toBeTruthy()
    expect(screen.queryByLabelText('Loading missing events')).toBeNull()
  })

  // Regression for #710 — the header badge must reflect the server total,
  // not the length of the current page. The user saw "20 flagged" while
  // the pill said 166 because the badge was counting the paginated array.
  it('shows the server total in the flagged badge, not events.length', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        total={166}
        page={1}
        pageSize={20}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('166 flagged')).toBeTruthy()
    expect(screen.queryByText('1 flagged')).toBeNull()
  })

  it('falls back to events.length when total is not provided', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('1 flagged')).toBeTruthy()
  })

  // Copilot follow-up on #710: when an admin deep-links to a page past the
  // end (or the row fetch is briefly stale during clamp-sync), the current
  // page is empty but the server total is not zero. The "all accounted for"
  // empty state must not render in that case — it would contradict the
  // header badge that's correctly showing the non-zero total.
  it('does not show the "all accounted for" empty state when total > 0 but page is empty', () => {
    render(
      <MissingTabContent
        events={[]}
        isDesktop
        nowIso={NOW}
        total={166}
        page={9}
        pageSize={20}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('166 flagged')).toBeTruthy()
    // Empty-state copy strings must NOT appear.
    expect(screen.queryByText("Nothing's gone missing.")).toBeNull()
  })
})
