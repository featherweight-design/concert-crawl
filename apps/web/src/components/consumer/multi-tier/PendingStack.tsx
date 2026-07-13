'use client'

import { PendingCardB } from '@/components/consumer/PendingCardB'

// ── Props ────────────────────────────────────────────────────────
export interface PendingStackProps {
  cards: Array<React.ComponentProps<typeof PendingCardB>>
}

// ── Component ────────────────────────────────────────────────────
export const PendingStack = ({ cards }: PendingStackProps) => {
  // Render every card. The all-tiers-pending path routes batches of any
  // size through here; capping at two silently dropped the third tier on
  // reload.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {cards.map((cardProps, idx) => (
        <PendingCardB key={idx} {...cardProps} />
      ))}
    </div>
  )
}
