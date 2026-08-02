// The panel's three non-list states (#737): loading, empty, error. Ported from
// notifications-panel.jsx.
//
// LOADING is a skeleton that is box-identical to a real R2 row, so nothing
// jumps when the data lands. The shimmer is decorative and `aria-hidden`; the
// spoken form is one visually-hidden sentence inside a single
// role="status"/aria-busy region, not one per skeleton.
//
// The Retry and empty CTA buttons keep their DRAWN size (they are ~34px and
// ~36px tall by design) and gain a 44px hit area from `.notif-hit44`, a
// transparent pseudo-element in globals.css. Both requirements are satisfied:
// the design table's "deliberately not raised" refers to the visual box.

import { NOTIFICATIONS_COPY } from './definitions/copy'
import { NotifGlyph } from './glyphs'

const SHIMMER = {
  background:
    'linear-gradient(90deg,var(--surface-1) 0%,var(--surface-2) 45%,var(--surface-1) 90%)',
  backgroundSize: '220% 100%',
  animation: 'notifSweep 1.5s linear infinite',
}

const Bar = ({
  width,
  height = 9,
}: {
  width: number | string
  height?: number
}) => (
  <span
    className="notif-shimmer"
    style={{
      display: 'block',
      width,
      height,
      borderRadius: 3,
      ...SHIMMER,
    }}
  />
)

export const NotifSkeletonRow = () => (
  <div
    aria-hidden="true"
    style={{
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      padding: '13px 14px 13px 12px',
      minHeight: 64,
      borderLeft: '2px solid transparent',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <span
      className="notif-shimmer"
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        flexShrink: 0,
        ...SHIMMER,
      }}
    />
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <Bar width="100%" height={10} />
      <Bar width="64%" height={10} />
      <Bar width="92%" />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Bar width={46} height={8} />
        <span style={{ flex: 1 }} />
        <Bar width={20} height={8} />
      </div>
    </div>
  </div>
)

export const NotifLoading = ({ rows = 3 }: { rows?: number | undefined }) => (
  <div role="status" aria-busy="true" aria-live="polite">
    <span
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
      }}
    >
      {NOTIFICATIONS_COPY.loading}
    </span>
    {Array.from({ length: rows }).map((_, i) => (
      <NotifSkeletonRow key={i} />
    ))}
  </div>
)

export const NotifEmpty = ({
  onAction,
}: {
  onAction?: (() => void) | undefined
}) => (
  <div
    style={{
      padding: '42px 26px 38px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--fg-subtle)',
        marginBottom: 2,
      }}
    >
      <NotifGlyph name="bell" size={22} />
    </span>
    <div
      style={{
        fontFamily: 'Inter, system-ui',
        fontSize: 17,
        fontWeight: 800,
        color: 'var(--fg)',
        letterSpacing: '-0.02em',
      }}
    >
      {NOTIFICATIONS_COPY.emptyTitle}
    </div>
    <div
      style={{
        fontFamily: 'Inter, system-ui',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--fg-muted)',
        maxWidth: 268,
        textWrap: 'pretty',
      }}
    >
      {NOTIFICATIONS_COPY.emptyBody}
    </div>
    <button
      type="button"
      className="notif-hit44"
      onClick={onAction}
      style={{
        all: 'unset',
        // all:unset writes `outline` inline, beating the
        // `.notif-hit44:focus-visible` rule in every state; `revert`
        // restores the UA ring.
        outline: 'revert',
        // all:unset resets display to inline and position to static; the
        // latter outranks `.notif-hit44 { position: relative }`.
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        cursor: 'pointer',
        marginTop: 8,
        padding: '9px 18px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        fontFamily: 'Inter, system-ui',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--signal)',
        letterSpacing: '-0.01em',
      }}
    >
      {NOTIFICATIONS_COPY.emptyAction}
    </button>
  </div>
)

export const NotifError = ({
  onRetry,
}: {
  onRetry?: (() => void) | undefined
}) => (
  <div
    role="alert"
    style={{
      padding: '34px 26px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <div
      style={{
        fontFamily: 'Inter, system-ui',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--fg)',
      }}
    >
      {NOTIFICATIONS_COPY.error}
    </div>
    <div
      style={{
        fontFamily: 'Inter, system-ui',
        fontSize: 12.5,
        color: 'var(--fg-muted)',
      }}
    >
      {NOTIFICATIONS_COPY.errorBody}
    </div>
    <button
      type="button"
      className="notif-hit44"
      onClick={onRetry}
      style={{
        all: 'unset',
        // all:unset writes `outline` inline, beating the
        // `.notif-hit44:focus-visible` rule in every state; `revert`
        // restores the UA ring.
        outline: 'revert',
        // all:unset resets display to inline and position to static; the
        // latter outranks `.notif-hit44 { position: relative }`.
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        cursor: 'pointer',
        marginTop: 4,
        padding: '8px 16px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        fontFamily: 'Inter, system-ui',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--signal)',
      }}
    >
      {NOTIFICATIONS_COPY.errorAction}
    </button>
  </div>
)
