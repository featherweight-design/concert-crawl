// The panel body (#737): header, states, day-grouped list, load-more. Ported
// from notifications-panel.jsx.
//
// SHELL-FREE ON PURPOSE. The dropdown and sheet shells are NOT built here —
// the chrome PR mounts this body inside the already-shipped UserMenuPopover /
// UserMenuSheet, which own the elevation, the focus trap and Esc. Building a
// second pair of shells would mean introducing --shadow tokens that no
// production theme defines.
//
// UNREAD COUNT has two sources and they are not the same number. `items` is
// one loaded page; the API's `unreadCount` spans the whole backfill window.
// The prop wins when supplied (chrome passes API truth); the derived count is
// the fallback, matching the mock.

import type { ConsumerNotification } from '@/lib/notifications'
import { NOTIFICATIONS_COPY } from './definitions/copy'
import { NMono } from './NMono'
import { NotifHeader } from './NotifHeader'
import { NotifItem } from './NotifItem'
import { NotifDayDivider } from './NotifDayDivider'
import { NotifLoading, NotifEmpty, NotifError } from './NotifStates'
import { groupByDay, unreadCount as countUnread } from './lib/format-time'

export type NotifPanelState = 'loading' | 'ready' | 'error'

export const NotifBody = ({
  items = [],
  state = 'ready',
  grouped = true,
  hasMore = false,
  isLoadingMore = false,
  unreadCount,
  onOpen,
  onMarkAll,
  onClose,
  onRetry,
  onAction,
  onLoadMore,
  showClose = false,
  maxHeight,
  now,
  notice,
}: {
  items?: ConsumerNotification[]
  state?: NotifPanelState
  grouped?: boolean
  hasMore?: boolean
  isLoadingMore?: boolean
  /** Window-wide count from the API. Falls back to the loaded page. */
  unreadCount?: number
  onOpen?: (item: ConsumerNotification) => void
  onMarkAll?: () => void
  onClose?: () => void
  onRetry?: () => void
  onAction?: () => void
  onLoadMore?: () => void
  showClose?: boolean
  maxHeight?: number | string
  now?: Date
  /**
   * An inline failure line under the header — currently a read mutation that
   * rolled back. Deliberately not a toast: the failure belongs to the surface
   * whose numbers just moved back.
   */
  notice?: string
}) => {
  const derived = unreadCount ?? countUnread(items)
  // Loading and error headers read zero: there is nothing on screen to mark.
  const headerCount = state === 'ready' ? derived : 0
  const groups = grouped
    ? groupByDay(items, now)
    : [{ key: '', items }].filter((group) => group.items.length > 0)

  return (
    <>
      <NotifHeader
        count={headerCount}
        settled={state === 'ready'}
        onMarkAll={onMarkAll}
        onClose={onClose}
        showClose={showClose}
      />
      {notice !== undefined && (
        <div
          role="alert"
          style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            fontFamily: 'Inter, system-ui',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--warning)',
            flexShrink: 0,
          }}
        >
          {notice}
        </div>
      )}
      <div
        className="notif-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight,
          background: 'var(--bg-elevated)',
        }}
      >
        {state === 'loading' && <NotifLoading />}
        {state === 'error' && <NotifError onRetry={onRetry} />}
        {state === 'ready' && items.length === 0 && (
          <NotifEmpty onAction={onAction} />
        )}
        {state === 'ready' && items.length > 0 && (
          <div role="list" aria-label={NOTIFICATIONS_COPY.panelTitle}>
            {groups.map((group, index) => (
              <div key={`${group.key}-${index}`} role="presentation">
                {group.key !== '' && <NotifDayDivider label={group.key} />}
                {group.items.map((item) => (
                  <div role="listitem" key={item.id}>
                    <NotifItem item={item} onOpen={onOpen} now={now} />
                  </div>
                ))}
              </div>
            ))}
            <div
              style={{
                padding: '12px 14px 16px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {hasMore && onLoadMore !== undefined ? (
                <button
                  type="button"
                  className="notif-hit44"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  aria-busy={isLoadingMore}
                  style={{
                    all: 'unset',
                    // all:unset writes `outline` inline, beating the
                    // `.notif-hit44:focus-visible` rule in every state;
                    // `revert` restores the UA ring.
                    outline: 'revert',
                    // all:unset resets display to inline (so width/padding
                    // draw no box) and position to static, which outranks
                    // `.notif-hit44 { position: relative }` and would anchor
                    // the 44px ::after outside the panel.
                    display: 'block',
                    position: 'relative',
                    boxSizing: 'border-box',
                    cursor: isLoadingMore ? 'progress' : 'pointer',
                    width: '100%',
                    textAlign: 'center',
                    padding: '9px 0',
                    borderRadius: 8,
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-strong)',
                    fontFamily: 'Inter, system-ui',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--signal)',
                    opacity: isLoadingMore ? 0.7 : 1,
                  }}
                >
                  {/* The mock's load-more had no in-flight affordance. The copy
                      deck's otherwise-unused `loadingVisible` is exactly the
                      missing string, so it lands here. */}
                  {isLoadingMore
                    ? NOTIFICATIONS_COPY.loadingVisible
                    : NOTIFICATIONS_COPY.loadMore}
                </button>
              ) : (
                <NMono ls="0.1em">{NOTIFICATIONS_COPY.endOfList}</NMono>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
