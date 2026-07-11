// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScarcityRail } from './ScarcityRail'
import type { ScarcityRailData } from './definitions/types'

const rail = (overrides: Partial<ScarcityRailData> = {}): ScarcityRailData => ({
  seatsClaimed: 63,
  seatsTotal: 100,
  seatsLeft: 37,
  daysLeft: 4,
  hoursLeft: 6,
  hot: false,
  ...overrides,
})

const barWidth = () => {
  const track = screen.getByTestId('scarcity-rail').lastElementChild
  const fill = track?.firstElementChild
  if (!(fill instanceof HTMLElement)) throw new Error('bar fill not rendered')
  return fill.style.width
}

describe('ScarcityRail — progress width clamping', () => {
  it('renders the claimed percentage for normal data', () => {
    render(<ScarcityRail rail={rail()} />)
    expect(barWidth()).toBe('63%')
  })

  it('renders 0% instead of NaN/Infinity when seatsTotal is 0', () => {
    render(<ScarcityRail rail={rail({ seatsTotal: 0 })} />)
    expect(barWidth()).toBe('0%')
  })

  it('caps at 100% when claimed drifts above total', () => {
    render(<ScarcityRail rail={rail({ seatsClaimed: 140 })} />)
    expect(barWidth()).toBe('100%')
  })

  it('floors at 0% when claimed is negative', () => {
    render(<ScarcityRail rail={rail({ seatsClaimed: -5 })} />)
    expect(barWidth()).toBe('0%')
  })
})
