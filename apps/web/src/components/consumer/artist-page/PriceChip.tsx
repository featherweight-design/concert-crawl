import React from 'react'

import { formatDollars } from '../definitions/lib'

import { ARTIST_COPY } from './definitions/copy'

interface PriceChipProps {
  price: number | null
}

/**
 * A known price gets a box; an unknown one deliberately does not — an absence
 * boxed would carry the same weight as a fact.
 */
export const PriceChip = ({ price }: PriceChipProps) => {
  if (price === null) {
    return (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: 'var(--fg-subtle)',
          flexShrink: 0,
        }}
      >
        {ARTIST_COPY.priceUnknown}
      </span>
    )
  }

  return (
    <span
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--fg)',
        padding: '4px 8px',
        borderRadius: 6,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {formatDollars(price)}
    </span>
  )
}
