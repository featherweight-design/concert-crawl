// One notification row (#737 R2 layout). Ported from notifications-panel.jsx.
//
// THE WHOLE ROW IS THE TARGET. There are no nested interactives — a button
// inside a `role="button"` is an ARIA violation and, at 320px, an unhittable
// one. Activation is click, Enter, or Space; Space calls preventDefault so the
// page does not scroll out from under the panel.
//
// R2 LAYOUT: the timestamp sits on the METADATA row, not the title's baseline,
// so real 35–80 character titles get the full column. Title clamps to 2 lines,
// body to 2. 64px is a floor, not a target — rows run ~92–116px.
//
// UNREAD IS SIGNALLED FOUR WAYS, never by colour alone (WCAG 1.4.1): a 2px
// left rail in the category ink, a --surface-1 row fill, a 700-weight title,
// and a trailing dot. Any one of them can be missed; all four cannot.

import type { KeyboardEvent } from 'react'
import type { ConsumerNotification } from '@/lib/notifications'
import { categoryFor } from './definitions/categories'
import { NMono } from './NMono'
import { NotifTile } from './NotifTile'
import { itemLabel, isUnread, relTime } from './lib/format-time'

export const NotifItem = ({
  item,
  onOpen,
  compact = false,
  now,
}: {
  item: ConsumerNotification
  onOpen?: ((item: ConsumerNotification) => void) | undefined
  compact?: boolean | undefined
  /** Injectable clock — tests freeze it; production leaves it undefined. */
  now?: Date | undefined
}) => {
  const cat = categoryFor(item.category)
  const unread = isUnread(item)

  const open = (): void => {
    onOpen?.(item)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    // preventDefault runs on every repeat, or holding Space scrolls the page
    // out from under the panel. Activation does not: keydown auto-repeats, and
    // a held key would otherwise fire one read mutation and navigation per tick.
    event.preventDefault()
    if (event.repeat) return
    open()
  }

  // `onOpen` is optional, so the button semantics have to be too: a row that
  // announces itself as a button, takes focus and then does nothing is worse
  // for a keyboard or screen-reader user than a plain one, whose text still
  // reads normally. Same rule as every button in this panel — nothing that
  // looks actionable is left unwired.
  const interactive =
    onOpen === undefined
      ? {}
      : {
          role: 'button',
          tabIndex: 0,
          'aria-label': itemLabel(item, now),
          onClick: open,
          onKeyDown,
        }

  return (
    <div
      // Every `.notif-row` rule is an interaction affordance — hover fill,
      // focus ring, chevron reveal — so an unwired row drops the class along
      // with the button semantics. Otherwise it still lights up under the
      // cursor and looks actionable.
      className={onOpen === undefined ? undefined : 'notif-row'}
      {...interactive}
      data-action-url={item.actionUrl ?? undefined}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: compact ? '11px 14px 11px 12px' : '13px 14px 13px 12px',
        minHeight: 64,
        cursor: onOpen === undefined ? 'default' : 'pointer',
        background: unread ? 'var(--surface-1)' : 'transparent',
        borderLeft: `2px solid ${unread ? cat.ink : 'transparent'}`,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <NotifTile category={item.category} read={!unread} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 13.5,
            lineHeight: 1.36,
            fontWeight: unread ? 700 : 600,
            color: unread ? 'var(--fg)' : 'var(--fg-muted)',
            letterSpacing: '-0.01em',
            textWrap: 'pretty',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </span>
        {item.body !== '' && (
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 12.5,
              lineHeight: 1.42,
              color: 'var(--fg-muted)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textWrap: 'pretty',
            }}
          >
            {item.body}
          </span>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 1,
          }}
        >
          <NMono>{cat.label}</NMono>
          {unread && (
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: 5,
                background: cat.ink,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ flex: 1 }} />
          <NMono ls="0.1em" style={{ flexShrink: 0 }}>
            {relTime(item.createdAt, now)}
          </NMono>
          {/* Revealed on hover AND on focus-visible — see globals.css. The
              mock's CSS only had :hover, which left the affordance invisible
              to keyboard users; the handoff README asks for both. */}
          <span
            className="notif-chev"
            aria-hidden="true"
            style={{
              opacity: 0,
              transform: 'translateX(-3px)',
              transition: 'all .14s ease',
              color: 'var(--fg-muted)',
              display: 'inline-flex',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path
                d="M4.5 2.5l3.5 3.5-3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}
