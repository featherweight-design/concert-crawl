// The collapsed notifications row inside the account menu (#737). Ported from
// notifications-chrome.jsx (MenuNotifRow).
//
// It is the inbox strip's zero-unread shape AND the option-A fallback shape:
// one row, bell chip, label, optional mono meta. Both call sites render this
// component rather than each drawing their own 44px row, so the target size
// and the hairline can only be got right once. It carries no nested
// interactives, so it is a real `<button>` — keyboard activation and the
// focus ring come from the platform rather than a hand-rolled key handler.

import { NMono } from './NMono'
import { NotifGlyph } from './glyphs'
import { NOTIFICATIONS_COPY } from './definitions/copy'

export const MenuNotifRow = ({
  count,
  meta,
  onActivate,
}: {
  count: number
  /** Overrides the default `panelSub(count)` — the zero row passes `markedAll`. */
  meta?: string
  onActivate: () => void
}) => {
  const hot = count > 0
  const metaText =
    meta ?? (hot ? NOTIFICATIONS_COPY.panelSub(count) : undefined)

  return (
    <button
      type="button"
      aria-label={NOTIFICATIONS_COPY.bellLabel(count)}
      onClick={onActivate}
      className="notif-row"
      style={{
        all: 'unset',
        // `all: unset` writes outline/display inline, outranking `.notif-row`
        // — same pattern, and the same reason, as NotifBody's "See all".
        outline: 'revert',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'var(--font-ui)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        minHeight: 44,
        boxSizing: 'border-box',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: hot ? 'var(--overlay-hover)' : 'transparent',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: 'var(--surface-2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          // The chip is a graphic, so --signal on it is a 3:1 element, not text.
          color: hot ? 'var(--signal)' : 'var(--fg-muted)',
          flexShrink: 0,
        }}
      >
        <NotifGlyph name="bell" size={11} />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: hot ? 800 : 600,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {NOTIFICATIONS_COPY.menuRow}
      </span>
      {metaText !== undefined && (
        <NMono color={hot ? 'var(--signal)' : 'var(--fg-muted)'} ls="0.10em">
          {metaText}
        </NMono>
      )}
    </button>
  )
}
