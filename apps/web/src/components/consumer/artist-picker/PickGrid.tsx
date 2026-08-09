'use client'

// The picker's grid box (PK-13). Column count is a PROP rather than a media
// query because the onboarding shell renders its mobile and desktop trees
// simultaneously, one of them `display:none` — a query would give both trees
// the same answer and the hidden one would be wrong the moment it showed.

import type { ReactNode } from 'react'

export const PickGrid = ({
  columns,
  children,
}: {
  columns: number
  children: ReactNode
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: 10,
    }}
  >
    {children}
  </div>
)
