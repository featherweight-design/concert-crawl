// @vitest-environment jsdom

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { EventWatchersResponse } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { stubMatchMedia } from '@/test-utils/match-media'
import { WatchersSurface } from './WatchersSurface'

const copy = CONSUMER_COPY.watchers

const watcher = (handle: string): EventWatchersResponse['named'][number] => ({
  handle,
  avatarColor: null,
})

// Desktop by default; the sheet test opts into the mobile viewport.
beforeEach(() => stubMatchMedia(false))

afterEach(cleanup)

describe('WatchersSurface', () => {
  it('renders nothing when nobody else is watching', () => {
    const { container } = render(
      <WatchersSurface data={{ total: 0, named: [] }} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing before the roster resolves', () => {
    const { container } = render(<WatchersSurface data={undefined} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows the skeleton while loading', () => {
    render(<WatchersSurface data={undefined} loading />)
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText(copy.loading)).not.toBeNull()
  })

  it('announces the whole sentence as one label on the group', () => {
    render(
      <WatchersSurface
        data={{ total: 1, named: [watcher('marisol')] }}
        expandable={false}
      />,
    )
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      `marisol ${copy.one}`,
    )
  })

  it('offers no expander when every watcher is already named', () => {
    render(<WatchersSurface data={{ total: 1, named: [watcher('marisol')] }} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('opens the roster in a desktop popover and closes it again', () => {
    render(
      <WatchersSurface
        data={{
          total: 14,
          named: [watcher('marisol'), watcher('dev_ftw'), watcher('priya')],
        }}
      />,
    )

    const toggle = screen.getByRole('button', { name: copy.rosterToggle(14) })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const panel = screen.getByRole('dialog', { name: copy.rosterTitle })
    // A popover is not modal, and it stays inline rather than portalled.
    expect(panel.getAttribute('aria-modal')).toBeNull()
    expect(screen.getByRole('list')).not.toBeNull()
    // The 11 unnamed watchers fold into a single honest summary row.
    expect(screen.getByText(copy.rosterOthers(11))).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.rosterHide }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the roster in a sheet at mobile widths', () => {
    stubMatchMedia(true)
    render(
      <WatchersSurface data={{ total: 14, named: [watcher('marisol')] }} />,
    )

    fireEvent.click(screen.getByRole('button', { name: copy.rosterToggle(14) }))
    const panel = screen.getByRole('dialog', { name: copy.rosterTitle })
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByTestId('cc-overlay-scrim')).not.toBeNull()
  })

  it('counts every watcher across the discs and the overflow chip', () => {
    // Two names is under the disc cap, so the chip has to be derived from what
    // actually rendered rather than from the cap.
    const { container } = render(
      <WatchersSurface
        data={{ total: 9, named: [watcher('marisol'), watcher('priya')] }}
      />,
    )

    const discs = container.querySelectorAll('[data-watcher-disc]').length
    const overflow = Number(
      container
        .querySelector('[data-watcher-overflow]')
        ?.textContent?.replace('+', ''),
    )
    expect(discs + overflow).toBe(9)
  })

  it('stays honest when there are watchers but no handles to show', () => {
    render(<WatchersSurface data={{ total: 4, named: [] }} />)
    expect(screen.getByText(copy.countOnlyHonest)).not.toBeNull()
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      copy.countOnly(4),
    )
  })

  it('offers no expander when the handle-less discs already fit the row', () => {
    render(<WatchersSurface data={{ total: 3, named: [] }} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('offers an expander once handle-less watchers overflow the row', () => {
    render(<WatchersSurface data={{ total: 4, named: [] }} />)
    expect(
      screen.getByRole('button', { name: copy.rosterToggle(4) }),
    ).not.toBeNull()
  })
})
