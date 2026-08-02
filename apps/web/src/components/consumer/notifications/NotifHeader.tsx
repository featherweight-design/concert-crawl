// The panel header (#737). Ported from notifications-panel.jsx.
//
// The subtitle is the state readout: "3 new" in --signal while there is
// anything to read, "All caught up." in --fg-muted once there isn't. Mark all
// read disappears at zero rather than sitting disabled — a dead control is
// worse than no control.
//
// The close button is 44×44 already. "Mark all read" is ~31px drawn and keeps
// that size; `.notif-hit44` gives it the 44px hit area without redrawing it.

import { NOTIFICATIONS_COPY } from './definitions/copy'
import { NMono } from './NMono'

export const NotifHeader = ({
  count,
  onMarkAll,
  onClose,
  showClose = false,
}: {
  count: number
  onMarkAll?: (() => void) | undefined
  onClose?: (() => void) | undefined
  showClose?: boolean | undefined
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 12px 11px 14px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-elevated)',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flex: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 14.5,
          fontWeight: 800,
          color: 'var(--fg)',
          letterSpacing: '-0.02em',
        }}
      >
        {NOTIFICATIONS_COPY.panelTitle}
      </span>
      <NMono color={count > 0 ? 'var(--signal)' : 'var(--fg-muted)'}>
        {count > 0
          ? NOTIFICATIONS_COPY.panelSub(count)
          : NOTIFICATIONS_COPY.markedAll}
      </NMono>
    </div>
    {count > 0 && (
      <button
        type="button"
        className="notif-hit44"
        onClick={onMarkAll}
        style={{
          all: 'unset',
          // all:unset writes `outline` as an INLINE declaration, which beats
          // the `.notif-hit44:focus-visible` author rule in every state and
          // would leave this button keyboard-invisible. `revert` rolls the
          // property back to the UA sheet, restoring the native ring.
          outline: 'revert',
          // all:unset resets display to inline and position to static. The
          // inline value outranks `.notif-hit44 { position: relative }`, so the
          // 44px ::after would anchor outside the panel and swallow row clicks.
          display: 'inline-flex',
          alignItems: 'center',
          position: 'relative',
          cursor: 'pointer',
          padding: '7px 10px',
          borderRadius: 7,
          fontFamily: 'Inter, system-ui',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--signal)',
          border: '1px solid var(--border)',
        }}
      >
        {NOTIFICATIONS_COPY.markAll}
      </button>
    )}
    {showClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label={NOTIFICATIONS_COPY.closeLabel}
        style={{
          all: 'unset',
          outline: 'revert',
          cursor: 'pointer',
          width: 44,
          height: 44,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-muted)',
          flexShrink: 0,
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
            d="M2.5 2.5l7 7m0-7l-7 7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    )}
  </div>
)
