// The unread pip (#737). Ported from notifications-chrome.jsx (NotifPip).
//
// A DOT, NEVER A COUNT. The number is announced, not drawn — the trigger's
// accessible name carries it (`bellLabel`), which is why the pip itself is
// `aria-hidden`. A badge with a numeral would be a second, smaller, worse
// rendering of information the label already gives, and at 8px it would fail
// every contrast and target rule this feature otherwise clears.
//
// The 2px ring is painted in the HOST surface's own background rather than a
// fixed colour, so the --signal fill keeps its separation on Electric, Jade
// and Light alike. Callers pass the bar they sit in.

import type { CSSProperties } from 'react'

export const NotifPip = ({
  size = 8,
  ring = 'var(--bg)',
  ringWidth = 2,
  animate = true,
  style,
}: {
  size?: number
  ring?: string
  ringWidth?: number
  animate?: boolean
  style?: CSSProperties
}) => (
  <span
    className={animate ? 'notif-pip' : undefined}
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: size,
      background: 'var(--signal)',
      boxShadow: `0 0 0 ${ringWidth}px ${ring}`,
      flexShrink: 0,
      // The keyframes live in globals.css alongside umPulse; reduced-motion
      // disables them there rather than here, so the dot stays visible.
      animation: animate ? 'notifPip 2.4s ease-in-out infinite' : 'none',
      ...style,
    }}
  />
)
