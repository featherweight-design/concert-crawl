// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { EventWatchersResponse } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { WatchersSurface } from './WatchersSurface'

const copy = CONSUMER_COPY.watchers

const watcher = (handle: string): EventWatchersResponse['named'][number] => ({
  handle,
  avatarColor: null,
})

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

  it('expands and collapses the roster', () => {
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
    expect(screen.queryByRole('list')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('list')).not.toBeNull()
    // The 11 unnamed watchers fold into a single honest summary row.
    expect(screen.getByText(copy.rosterOthers(11))).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.rosterHide }))
    expect(screen.queryByRole('list')).toBeNull()
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
