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
    let resolveDismiss: (() => void) | null = null
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
    resolveDismiss?.()
  })
})
