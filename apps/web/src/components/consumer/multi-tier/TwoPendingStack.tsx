'use client'

import {
  PendingCardB,
  type PendingCardBProps,
} from '@/components/consumer/PendingCardB'

// ── Props ────────────────────────────────────────────────────────
export interface TwoPendingStackProps {
  cards: Array<React.ComponentProps<typeof PendingCardB>>
}

// ── Component ────────────────────────────────────────────────────
export const TwoPendingStack = ({ cards }: TwoPendingStackProps) => {
  const firstCard = cards[0] as PendingCardBProps | undefined
  const secondCard = cards[1] as PendingCardBProps | undefined

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {firstCard !== undefined && <PendingCardB {...firstCard} />}
      {secondCard !== undefined && <PendingCardB {...secondCard} />}
    </div>
  )
}
