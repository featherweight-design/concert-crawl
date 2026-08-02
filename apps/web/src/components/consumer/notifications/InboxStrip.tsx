'use client'

// The top-of-menu inbox strip (#737, handoff Option B). Ported from
// notifications-chrome.jsx (InboxStrip).
//
// WHY THE STRIP RATHER THAN A ROW: option A's plain "Notifications" row makes
// the pip's promise cost a second tap to redeem. The strip pays it out at the
// first tap — the newest unread rows are already on screen, and "See all N" is
// the escalation, not the entry.
//
// The preview rows are deliberately NOT interactive. The mock renders them
// without `onOpen`, and a tappable row nested above a "See all" button inside a
// menu that is itself inside a dialog is three activation targets stacked in
// 44px. The strip advertises; the panel acts.

import type { ConsumerNotification } from '@/lib/notifications'
import {
  useNotifications,
  flattenNotifications,
  unreadCountOf,
} from '@/lib/queries/use-notifications'
import { NMono } from './NMono'
import { NotifItem } from './NotifItem'
import { NotifPip } from './NotifPip'
import { MenuNotifRow } from './MenuNotifRow'
import { NOTIFICATIONS_COPY } from './definitions/copy'

/** The mock previews at most two rows before deferring to "See all N". */
const MAX_PREVIEW = 2

export const InboxStrip = ({ onSeeAll }: { onSeeAll: () => void }) => {
  const query = useNotifications()
  const items = flattenNotifications(query.data)
  const unread: ConsumerNotification[] = items.filter(
    (item) => item.readAt === null,
  )
  // Window-wide truth from the API — the loaded page can hold fewer unread
  // rows than the account actually has.
  const count = unreadCountOf(query.data)
  const settled = !query.isPending && !query.isError

  if (count === 0 || unread.length === 0) {
    return (
      <MenuNotifRow
        count={count}
        // Loading and error have nothing to claim: "All caught up." while the
        // first page is still in flight would be a guess presented as a fact.
        {...(settled ? { meta: NOTIFICATIONS_COPY.markedAll } : {})}
        onActivate={onSeeAll}
      />
    )
  }

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px 6px',
        }}
      >
        <NMono color="var(--signal)">{NOTIFICATIONS_COPY.panelTitle}</NMono>
        {/* Static here: the animated pip lives on the trigger, and a second
            pulsing dot inside the surface it opened is noise. */}
        <NotifPip size={6} ring="var(--bg-elevated)" animate={false} />
        <span style={{ flex: 1 }} />
        <NMono ls="0.1em">{NOTIFICATIONS_COPY.panelSub(count)}</NMono>
      </div>
      {unread.slice(0, MAX_PREVIEW).map((item) => (
        <NotifItem key={item.id} item={item} compact />
      ))}
      <button
        type="button"
        onClick={onSeeAll}
        className="notif-hit44"
        style={{
          all: 'unset',
          // `all: unset` writes outline/position/display inline, outranking
          // `.notif-hit44` — see the note on the same pattern in NotifBody.
          outline: 'revert',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          boxSizing: 'border-box',
          padding: '11px 14px',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 700,
          color: 'var(--signal)',
        }}
      >
        {NOTIFICATIONS_COPY.seeAll(count)}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.5 2.5l3.5 3.5-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
