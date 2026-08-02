'use client'

// Notifications mode for the account menu (#737).
//
// ONE ANCHOR, ONE SURFACE, ONE ESCAPE. This is not a second popover: it swaps
// into the SAME shell the menu body occupies (the desktop popover, the mobile
// sheet), behind a `‹ Menu` back row. So the shell keeps owning elevation, the
// focus trap, click-outside and Escape — and Escape from here closes the whole
// menu rather than popping back to the menu body, because a dismiss gesture
// that only half-dismisses is the thing users complain about.
//
// Entering this mode is what clears the pip: `markPanelSeen` writes the
// watermark once per entry, fire-and-forget. It deliberately disagrees with the
// per-row read rails — the bell stops shouting the moment you look, the rails
// keep answering "which of these have I dealt with" on the next visit.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ConsumerNotification } from '@/lib/notifications'
import {
  useNotifications,
  useNotificationMutations,
  flattenNotifications,
  unreadCountOf,
} from '@/lib/queries/use-notifications'
import { NMono } from './NMono'
import { NotifBody, type NotifPanelState } from './NotifBody'
import {
  NOTIFICATIONS_COPY,
  NOTIFICATIONS_EMPTY_ACTION_HREF,
} from './definitions/copy'

export const panelStateOf = (
  isPending: boolean,
  isError: boolean,
): NotifPanelState => (isPending ? 'loading' : isError ? 'error' : 'ready')

export const NotifMenuPanel = ({
  onBack,
  onNavigate,
  onClose,
  maxHeight,
}: {
  onBack: () => void
  /** Dismisses the menu after a row navigates away from under it. */
  onNavigate: () => void
  /**
   * Dismisses the whole menu from inside the panel. Supplied by the mobile
   * sheet only: the desktop popover answers Escape, so a second dismiss there
   * would be a redundant control, but on a touch sheet `‹ Menu` is the only
   * way out and it costs two gestures — back, then dismiss.
   */
  onClose?: () => void
  maxHeight?: number
}) => {
  const router = useRouter()
  const query = useNotifications()
  const { markRead, markAllRead, markSeen } = useNotificationMutations()
  const surfaceRef = useRef<HTMLDivElement>(null)

  // Held in a ref so the seen-write effect can run exactly once per entry:
  // the mutation object is a fresh identity on every render, so depending on
  // it directly would re-fire the write on each keystroke in the panel.
  const markSeenRef = useRef(markSeen.mutateAsync)
  markSeenRef.current = markSeen.mutateAsync

  useEffect(() => {
    void (async () => {
      try {
        await markSeenRef.current()
      } catch (err) {
        // Non-fatal: the pip simply stays up until the next successful open.
        console.warn('Notifications: could not mark the panel seen', err)
      }
    })()
  }, [])

  // Focus follows the mode switch. The shell's trap fired on open and will not
  // fire again, so without this a keyboard user's focus would still be parked
  // on the menu body that just unmounted.
  useEffect(() => {
    surfaceRef.current?.focus()
  }, [])

  const open = (item: ConsumerNotification): void => {
    if (item.readAt === null) markRead.mutate(item.id)
    // `actionUrl` is already narrowed to a same-origin path at parse time
    // (safeParseNotification), so there is nothing left to validate here.
    if (item.actionUrl !== null) {
      onNavigate()
      router.push(item.actionUrl)
    }
  }

  return (
    <div
      ref={surfaceRef}
      tabIndex={-1}
      style={{
        outline: 'none',
        // A column so NotifBody's scroll region can claim the leftover space
        // when a shell hands this panel a fixed height (the sheet's 88svh).
        // Inert in the desktop popover, whose parent is not a flex container
        // and which bounds the panel with `maxHeight` instead.
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* A real `<button>`: nothing interactive is nested inside it, so the
          platform's keyboard activation and focus ring beat a hand-rolled
          pair. */}
      <button
        type="button"
        aria-label={NOTIFICATIONS_COPY.menuBack}
        onClick={onBack}
        className="notif-row"
        style={{
          all: 'unset',
          // `all: unset` writes outline/display inline, outranking
          // `.notif-row` — same pattern as NotifBody's "See all".
          outline: 'revert',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          minHeight: 44,
          boxSizing: 'border-box',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.5 2.5L4 6l3.5 3.5"
            stroke="var(--fg-muted)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <NMono>{NOTIFICATIONS_COPY.menuBack}</NMono>
      </button>
      <NotifBody
        items={flattenNotifications(query.data)}
        unreadCount={unreadCountOf(query.data)}
        state={panelStateOf(query.isPending, query.isError)}
        hasMore={query.hasNextPage}
        isLoadingMore={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
        onRetry={() => void query.refetch()}
        onMarkAll={() => markAllRead.mutate()}
        onOpen={open}
        {...(onClose === undefined ? {} : { showClose: true, onClose })}
        // A failed read mutation rolls the cache back silently — the count
        // walks back to where it was and the button looks like it undid
        // itself. One inline line, no toast, no retry queue.
        {...(markRead.isError || markAllRead.isError
          ? { notice: NOTIFICATIONS_COPY.actionFailed }
          : {})}
        onAction={() => {
          onNavigate()
          router.push(NOTIFICATIONS_EMPTY_ACTION_HREF)
        }}
        {...(maxHeight === undefined ? {} : { maxHeight })}
      />
    </div>
  )
}
