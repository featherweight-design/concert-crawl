import Link from 'next/link'
import React from 'react'

import { ARTIST_COPY } from './definitions/copy'

/**
 * Box metrics for the crumb row. Exported so the route skeleton's CrumbSkeleton
 * reserves the identical height — the skeleton originally omitted the crumb
 * entirely, which dropped the whole desktop grid by 38px when content landed.
 */
export const CRUMB_BOX: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 18,
  fontFamily: 'Inter, system-ui',
  fontSize: 13,
  color: 'var(--fg-muted)',
}

/** Desktop-only wayfinding. Mobile uses the BackChip over the plate instead. */
export const Crumb = ({ name }: { name: string }) => (
  <nav aria-label={ARTIST_COPY.crumbAria} style={CRUMB_BOX}>
    <Link href="/events" style={{ color: 'inherit' }}>
      {ARTIST_COPY.crumbRoot}
    </Link>
    <span aria-hidden="true" style={{ color: 'var(--fg-subtle)' }}>
      /
    </span>
    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{name}</span>
  </nav>
)
