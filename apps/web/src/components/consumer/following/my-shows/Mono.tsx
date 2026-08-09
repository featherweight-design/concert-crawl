// The mono status label (nf-shared.jsx `Mono`) — group headings and eyebrows.
//
// Uppercasing is a CSS transform, never baked into the string: the copy file
// stays readable, and a screen reader hears sentence case rather than spelling
// out what it takes for an acronym.

import type { CSSProperties, ElementType, ReactNode } from 'react'

interface MonoProps {
  children: ReactNode
  /** Defaults to a span; group headings pass `h2`. */
  as?: ElementType
  size?: number
  color?: string
  ls?: string
  style?: CSSProperties
}

export const Mono = ({
  children,
  as: Tag = 'span',
  size = 10,
  color = 'var(--fg-subtle)',
  ls = '0.14em',
  style,
}: MonoProps) => (
  <Tag
    style={{
      display: 'block',
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: size,
      fontWeight: 700,
      letterSpacing: ls,
      textTransform: 'uppercase',
      color,
      ...style,
    }}
  >
    {children}
  </Tag>
)
