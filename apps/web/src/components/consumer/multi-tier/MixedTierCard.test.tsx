// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MixedTierCard } from './MixedTierCard'

afterEach(() => {
  cleanup()
})

describe('MixedTierCard', () => {
  it('renders a boxoffice headline + a resale alternate (coral)', () => {
    const { container } = render(
      <MixedTierCard
        headline={{
          floor: 25,
          tier: 'GA',
          vendor: 'Bluebird',
          kind: 'boxoffice',
        }}
        alternates={[
          {
            tier: 'VIP',
            vendor: 'StubHub',
            floor: 150,
            kind: 'resale',
          },
        ]}
      />,
    )

    expect(screen.getByText('$25')).toBeDefined()
    expect(screen.getByText('Box office')).toBeDefined()
    expect(screen.getByText('$150')).toBeDefined()

    const dots = Array.from(
      container.querySelectorAll('div[style*="border-radius: 2.5px"]'),
    )
    const coral = dots.find((dot) =>
      (dot as HTMLElement).style.background.includes('oklch(0.65 0.2 25)'),
    )
    expect(coral).toBeDefined()
  })

  it('renders a resale headline (coral PendingTrustPill)', () => {
    render(
      <MixedTierCard
        headline={{
          floor: 110,
          tier: 'GA',
          vendor: 'StubHub',
          kind: 'resale',
        }}
        alternates={[]}
      />,
    )
    const pill = screen.getByText('Resale')
    expect(pill).toBeDefined()
    const pillEl = pill as HTMLElement
    expect(pillEl.style.background).toContain('oklch(0.65 0.2 25)')
  })
})
