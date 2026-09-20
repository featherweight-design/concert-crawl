// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MissingTabContent } from './MissingTabContent'
import { type MissingRowEvent } from '../missing/MissingRow'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const NOW = '2026-06-16T03:00:00Z'

const SAMPLE: MissingRowEvent[] = [
  {
    id: 'evt-1',
    title: 'Lord Huron',
    venueName: 'Mission Ballroom',
    venueId: 'ven-1',
    date: '2026-06-19',
    showTime: '20:00',
    lastSeenAt: '2026-06-12T03:00:00Z',
    firstMissingAt: '2026-06-13T03:00:00Z',
    eventUrl: 'https://missionballroom.com/events/lord-huron',
    sourceUrl: 'https://missionballroom.com/events',
    classification: 'crawl_gap',
    clusterCount: 1,
    movedCandidate: null,
  },
]

const WITH_CANDIDATE: MissingRowEvent[] = [
  {
    ...SAMPLE[0]!,
    movedCandidate: {
      id: 'evt-2',
      reason: 'date',
      title: 'Lord Huron Live',
      date: '2026-08-02',
      venueName: 'Mission Ballroom',
    },
  },
]

describe('MissingTabContent — confirm move', () => {
  // The merge deletes a row, moves watch rows and notifies every watcher.
  // None of that is reversible, so the action must not fire on one click.
  it('opens a confirm dialog rather than merging on the first click', () => {
    const onConfirmMove = vi.fn(async () => {})
    render(
      <MissingTabContent
        events={WITH_CANDIDATE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={onConfirmMove}
        onDismiss={async () => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Confirm move/ }))
    expect(onConfirmMove).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('names both shows and the reason in the dialog', () => {
    render(
      <MissingTabContent
        events={WITH_CANDIDATE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Confirm move/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Lord Huron Live')
    expect(dialog.textContent).toContain('Same venue, new date')
  })

  it('merges only after the dialog is confirmed', async () => {
    // Typed parameter so the call tuple carries the argument; a bare
    // `vi.fn(async () => {})` types `calls[0]` as an empty tuple.
    const onConfirmMove = vi.fn(async (_event: MissingRowEvent) => {})
    render(
      <MissingTabContent
        events={WITH_CANDIDATE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={onConfirmMove}
        onDismiss={async () => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Confirm move/ }))
    fireEvent.click(screen.getByRole('button', { name: /Merge and notify/ }))
    expect(onConfirmMove).toHaveBeenCalledTimes(1)
    expect(onConfirmMove.mock.calls[0]?.[0]).toMatchObject({ id: 'evt-1' })
  })

  it('cancelling closes the dialog without merging', () => {
    const onConfirmMove = vi.fn(async () => {})
    render(
      <MissingTabContent
        events={WITH_CANDIDATE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={onConfirmMove}
        onDismiss={async () => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Confirm move/ }))
    // Exact, not /Cancel/ — the row's own "Cancelled" action also matches.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirmMove).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the dialog on Escape without merging', () => {
    const onConfirmMove = vi.fn(async (_event: MissingRowEvent) => {})
    render(
      <MissingTabContent
        events={WITH_CANDIDATE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={onConfirmMove}
        onDismiss={async () => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Confirm move/ }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onConfirmMove).not.toHaveBeenCalled()
  })

  // `aria-modal` claims the background is inert, so focus must actually be
  // inside the dialog. Cancel rather than confirm: the confirm is
  // irreversible and a stray Enter on open must not commit it.
  it('moves focus into the dialog, onto the non-destructive action', () => {
    render(
      <MissingTabContent
        events={WITH_CANDIDATE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Confirm move/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.textContent).toBe('Cancel')
  })

  it('offers no confirm action on a row with no suggestion', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: /Confirm move/ })).toBeNull()
  })
})

describe('MissingTabContent', () => {
  it('renders the desktop table when isDesktop=true', () => {
    render(
      <MissingTabContent
        events={SAMPLE}
        isDesktop
        nowIso={NOW}
        onMarkPostponed={async () => {}}
        onMarkCancelled={async () => {}}
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
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
        onConfirmMove={async () => {}}
        onDismiss={async () => {}}
      />,
    )
    expect(screen.getByText('166 flagged')).toBeTruthy()
    // Empty-state copy strings must NOT appear.
    expect(screen.queryByText("Nothing's gone missing.")).toBeNull()
  })
})
