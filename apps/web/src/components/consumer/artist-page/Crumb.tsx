import Link from 'next/link'
import React from 'react'

import { ARTIST_COPY } from './definitions/copy'

/** Desktop-only wayfinding. Mobile uses the BackChip over the plate instead. */
export const Crumb = ({ name }: { name: string }) => (
  <nav
    aria-label={ARTIST_COPY.crumbAria}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 18,
      fontFamily: 'Inter, system-ui',
      fontSize: 13,
      color: 'var(--fg-muted)',
    }}
  >
    <Link href="/events" style={{ color: 'inherit' }}>
      {ARTIST_COPY.crumbRoot}
    </Link>
    <span aria-hidden="true" style={{ color: 'var(--fg-subtle)' }}>
      /
    </span>
    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{name}</span>
  </nav>
)
