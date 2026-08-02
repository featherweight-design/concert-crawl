// The mono metadata face used by every small-caps label in the notification
// panel (#737). Ported from notifications-panel.jsx (NMono).
//
// CONTRAST RULE (WCAG 1.4.3): no text in this panel renders in --fg-subtle or
// in a category ink. Both are 3:1-class tokens — fine for graphics, short of
// 4.5:1 for small text. Category colour lives on the tile glyph, the 2px rail
// and the unread dot; the words stay --fg-muted. Colour redundancy is
// unaffected, because the category is spelled out here.

import type { CSSProperties, ReactNode } from 'react'

export const NMono = ({
  children,
  color = 'var(--fg-muted)',
  size = 9.5,
  ls = '0.14em',
  style,
}: {
  children: ReactNode
  color?: string
  size?: number
  ls?: string
  style?: CSSProperties
}) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: size,
      fontWeight: 700,
      letterSpacing: ls,
      textTransform: 'uppercase',
      color,
      ...style,
    }}
  >
    {children}
  </span>
)
