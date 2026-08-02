// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  within,
  fireEvent,
} from '@testing-library/react'
import type { ConsumerNotification } from '@/lib/notifications'
import { NotifBody } from './NotifBody'
import { NotifItem } from './NotifItem'
import { NOTIFICATIONS_COPY } from './definitions/copy'

afterEach(cleanup)

const NOW = new Date('2026-07-24T20:10:00-06:00')

const notification = (
  over: Partial<ConsumerNotification> = {},
): ConsumerNotification => ({
  id: 'n1',
  category: 'watch.pricedrop',
  title: 'The price for Geese at Bluebird Theater dropped from $41 to $28.',
  body: "Cheapest it's been since the on-sale.",
  actionUrl: '/events/e1',
  readAt: null,
  createdAt: '2026-07-24T18:10:00-06:00',
  metadata: null,
  ...over,
})

describe('NotifBody — panel states', () => {
  it('renders the loading state as a polite busy region, never a list', () => {
    render(<NotifBody state="loading" now={NOW} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent(NOTIFICATIONS_COPY.loading)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows "All caught up." in the header while loading, not a stale count', () => {
    render(<NotifBody state="loading" unreadCount={4} now={NOW} />)
    expect(screen.getByText(NOTIFICATIONS_COPY.markedAll)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).not.toBeInTheDocument()
  })

  it('renders the error state as an alert with a wired Retry', async () => {
    const onRetry = vi.fn()
    render(<NotifBody state="error" onRetry={onRetry} now={NOW} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(NOTIFICATIONS_COPY.error)
    expect(alert).toHaveTextContent(NOTIFICATIONS_COPY.errorBody)
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.errorAction }),
    )
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders the empty state with a wired CTA and no hint line', async () => {
    const onAction = vi.fn()
    render(<NotifBody state="ready" items={[]} onAction={onAction} now={NOW} />)
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyTitle)).toBeInTheDocument()
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyBody)).toBeInTheDocument()
    // emptyHint has no render site in the handoff — it must stay unrendered.
    expect(
      screen.queryByText(NOTIFICATIONS_COPY.emptyHint),
    ).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.emptyAction }),
    )
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('renders zero-after-mark-all as a list, not as the empty state', () => {
    render(
      <NotifBody
        state="ready"
        items={[notification({ readAt: '2026-07-24T19:00:00-06:00' })]}
        now={NOW}
      />,
    )
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText(NOTIFICATIONS_COPY.markedAll)).toBeInTheDocument()
    expect(
      screen.queryByText(NOTIFICATIONS_COPY.emptyTitle),
    ).not.toBeInTheDocument()
  })
})

describe('NotifBody — header count', () => {
  it('prefers the API window count over the loaded page', () => {
    render(
      <NotifBody state="ready" items={[notification()]} unreadCount={12} />,
    )
    expect(
      screen.getByText(NOTIFICATIONS_COPY.panelSub(12)),
    ).toBeInTheDocument()
  })

  it('falls back to the loaded page when no count is supplied', () => {
    render(
      <NotifBody
        state="ready"
        items={[
          notification({ id: 'a' }),
          notification({ id: 'b', readAt: '2026-07-24T19:00:00-06:00' }),
        ]}
      />,
    )
    expect(screen.getByText(NOTIFICATIONS_COPY.panelSub(1))).toBeInTheDocument()
  })

  it('fires onMarkAll from the header', async () => {
    const onMarkAll = vi.fn()
    render(
      <NotifBody
        state="ready"
        items={[notification()]}
        onMarkAll={onMarkAll}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    )
    expect(onMarkAll).toHaveBeenCalledTimes(1)
  })
})

describe('NotifBody — day grouping', () => {
  it('renders one divider per day run, in list order', () => {
    render(
      <NotifBody
        state="ready"
        now={NOW}
        items={[
          notification({ id: 'a', createdAt: '2026-07-24T18:35:00-06:00' }),
          notification({ id: 'b', createdAt: '2026-07-24T11:20:00-06:00' }),
          notification({ id: 'c', createdAt: '2026-07-23T21:14:00-06:00' }),
        ]}
      />,
    )
    expect(screen.getByText(NOTIFICATIONS_COPY.today)).toBeInTheDocument()
    expect(screen.getByText(NOTIFICATIONS_COPY.yesterday)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('opens on the newest real day when nothing arrived today', () => {
    render(
      <NotifBody
        state="ready"
        now={NOW}
        items={[
          notification({ id: 'a', createdAt: '2026-07-20T18:35:00-06:00' }),
          notification({ id: 'b', createdAt: '2026-07-19T15:22:00-06:00' }),
        ]}
      />,
    )
    expect(screen.getByText('Mon, Jul 20')).toBeInTheDocument()
    expect(screen.getByText('Sun, Jul 19')).toBeInTheDocument()
    expect(screen.queryByText(NOTIFICATIONS_COPY.today)).not.toBeInTheDocument()
  })

  it('keeps duplicate rows with distinct ids — writers are not exactly-once', () => {
    render(
      <NotifBody
        state="ready"
        now={NOW}
        items={[notification({ id: 'a' }), notification({ id: 'b' })]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders a flat list with no dividers when grouping is off', () => {
    render(
      <NotifBody
        state="ready"
        grouped={false}
        now={NOW}
        items={[notification()]}
      />,
    )
    expect(screen.queryByText(NOTIFICATIONS_COPY.today)).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})

describe('NotifBody — paging footer', () => {
  it('closes the list with the end-of-list line when there is no more', () => {
    render(<NotifBody state="ready" items={[notification()]} now={NOW} />)
    expect(screen.getByText(NOTIFICATIONS_COPY.endOfList)).toBeInTheDocument()
  })

  it('offers "Older notifications" and fires onLoadMore', async () => {
    const onLoadMore = vi.fn()
    render(
      <NotifBody
        state="ready"
        items={[notification()]}
        hasMore
        onLoadMore={onLoadMore}
        now={NOW}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.loadMore }),
    )
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('disables and relabels the load-more button while a page is in flight', () => {
    render(
      <NotifBody
        state="ready"
        items={[notification()]}
        hasMore
        isLoadingMore
        onLoadMore={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', {
      name: NOTIFICATIONS_COPY.loadingVisible,
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('NotifBody — unwired controls never render', () => {
  // Every handler on this component is optional, so a caller that forgets one
  // would otherwise ship a button that looks live and does nothing. Hiding is
  // the panel's rule for a dead control, already used for mark-all at zero.

  it('hides "Mark all read" when no handler is wired, despite a count', () => {
    render(<NotifBody state="ready" items={[notification()]} unreadCount={3} />)
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).not.toBeInTheDocument()
  })

  it('hides the close button when showClose is set but onClose is not', () => {
    render(<NotifBody state="ready" items={[notification()]} showClose />)
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.closeLabel }),
    ).not.toBeInTheDocument()
  })

  it('hides Retry rather than showing an inert one', () => {
    render(<NotifBody state="error" />)
    // The error still explains itself; only the dead control is gone.
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.errorAction }),
    ).not.toBeInTheDocument()
  })

  it('hides the empty-state CTA rather than showing an inert one', () => {
    render(<NotifBody state="ready" items={[]} />)
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyBody)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.emptyAction }),
    ).not.toBeInTheDocument()
  })

  it('falls back to the end-of-list line when hasMore has no onLoadMore', () => {
    render(<NotifBody state="ready" items={[notification()]} hasMore />)
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.loadMore }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(NOTIFICATIONS_COPY.endOfList)).toBeInTheDocument()
  })
})

describe('NotifItem', () => {
  it('gives an unread row a category rail, a dot and a bold title', () => {
    render(<NotifItem item={notification()} onOpen={vi.fn()} now={NOW} />)
    const row = screen.getByRole('button')
    // jsdom drops a `border-left` shorthand carrying a var(), so assert on
    // the serialised inline style rather than the computed one.
    expect(row.getAttribute('style')).toContain(
      'border-left: 2px solid var(--success)',
    )
    expect(row).toHaveStyle({ background: 'var(--surface-1)' })
    const title = within(row).getByText(/The price for Geese/)
    expect(title).toHaveStyle({ fontWeight: '700' })
    expect(row.getAttribute('aria-label')).toContain('. Unread')
  })

  it('drops every unread signal once the row has been read', () => {
    render(
      <NotifItem
        item={notification({ readAt: '2026-07-24T19:00:00-06:00' })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    )
    const row = screen.getByRole('button')
    expect(row.getAttribute('style')).toContain(
      'border-left: 2px solid transparent',
    )
    expect(row).toHaveStyle({ background: 'transparent' })
    expect(within(row).getByText(/The price for Geese/)).toHaveStyle({
      fontWeight: '600',
    })
    expect(row.getAttribute('aria-label')).not.toContain('Unread')
  })

  it('is not announced as a button when no open handler is wired', () => {
    // An inert focusable row is worse for a keyboard or screen-reader user
    // than a plain one — the text still reads either way.
    render(<NotifItem item={notification()} now={NOW} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(notification().title)).toBeInTheDocument()
  })

  it('is a single target with no nested interactives', () => {
    render(<NotifItem item={notification()} onOpen={vi.fn()} now={NOW} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0')
  })

  it('spells the category out, so colour is never the only signal', () => {
    render(<NotifItem item={notification()} now={NOW} />)
    expect(screen.getByText('Price drop')).toBeInTheDocument()
    expect(screen.getByText('2h')).toBeInTheDocument()
  })

  it('falls back to a neutral presentation for an unknown category', () => {
    render(
      <NotifItem
        item={notification({ category: 'venue.gone' })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    )
    expect(screen.getByText('Update')).toBeInTheDocument()
    expect(screen.getByRole('button').getAttribute('style')).toContain(
      'border-left: 2px solid var(--fg-muted)',
    )
  })

  it('opens on click', async () => {
    const onOpen = vi.fn()
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }))
  })

  it('opens on Enter', () => {
    const onOpen = vi.fn()
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('opens on Space without letting the page scroll', () => {
    const onOpen = vi.fn()
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />)
    // fireEvent returns false when the handler called preventDefault, which is
    // the only thing standing between Space and a scrolled-away panel.
    const notCancelled = fireEvent.keyDown(screen.getByRole('button'), {
      key: ' ',
    })
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(notCancelled).toBe(false)
  })

  it('ignores keys that are not activation keys, and lets them through', () => {
    const onOpen = vi.fn()
    render(<NotifItem item={notification()} onOpen={onOpen} now={NOW} />)
    const row = screen.getByRole('button')
    for (const key of ['Tab', 'ArrowDown', 'a', 'Escape']) {
      expect(fireEvent.keyDown(row, { key })).toBe(true)
    }
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('omits the body element entirely when the body is empty', () => {
    render(<NotifItem item={notification({ body: '' })} now={NOW} />)
    expect(
      screen.queryByText("Cheapest it's been since the on-sale."),
    ).not.toBeInTheDocument()
  })

  it('carries the action url as data, not as a nested link', () => {
    render(<NotifItem item={notification()} onOpen={vi.fn()} now={NOW} />)
    expect(screen.getByRole('button')).toHaveAttribute(
      'data-action-url',
      '/events/e1',
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('omits the data attribute when there is nowhere to go', () => {
    render(
      <NotifItem
        item={notification({ actionUrl: null })}
        onOpen={vi.fn()}
        now={NOW}
      />,
    )
    expect(screen.getByRole('button')).not.toHaveAttribute('data-action-url')
  })
})
