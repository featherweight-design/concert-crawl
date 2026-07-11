// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { DailyCost } from '@concert-crawl/types'
import { CostChart } from './CostChart'

beforeEach(() => {
  cleanup()
})

const days: DailyCost[] = [
  { date: '2026-07-06', costUsd: 1 },
  { date: '2026-07-07', costUsd: 3.5 },
  { date: '2026-07-08', costUsd: 2 },
]

// JSDOM has no layout — give the chart wrapper a real bounding box so pointer
// x → index math has a width to work with.
const stubChartRect = (element: HTMLElement, width = 300) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: 110,
    width,
    height: 110,
    toJSON: () => ({}),
  })
}

const renderChart = () => {
  render(<CostChart days={days} ariaLabel="LLM spend chart" />)
  const svg = screen.getByRole('img', { name: 'LLM spend chart' })
  const wrapper = svg.parentElement
  if (!(wrapper instanceof HTMLElement)) throw new Error('missing wrapper')
  stubChartRect(wrapper)
  return wrapper
}

describe('CostChart', () => {
  it('renders nothing for an empty series', () => {
    const { container } = render(<CostChart days={[]} ariaLabel="empty" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows no tooltip until the pointer interacts', () => {
    renderChart()
    expect(screen.queryByText(/JUL/)).toBeNull()
  })

  it('shows the nearest day tooltip on pointer move', () => {
    const wrapper = renderChart()
    // 300px wide, 3 points at x = 0 / 150 / 300 — 160 is nearest the middle.
    fireEvent.pointerMove(wrapper, { clientX: 160 })
    expect(screen.getByText('JUL 7 · $3.50')).toBeDefined()
  })

  it('shows the tooltip on pointer down (tap)', () => {
    const wrapper = renderChart()
    fireEvent.pointerDown(wrapper, { clientX: 290 })
    expect(screen.getByText('JUL 8 · $2.00')).toBeDefined()
  })

  it('clamps out-of-range pointer positions to the series bounds', () => {
    const wrapper = renderChart()
    fireEvent.pointerMove(wrapper, { clientX: -40 })
    expect(screen.getByText('JUL 6 · $1.00')).toBeDefined()
  })

  it('hides the tooltip on pointer leave', () => {
    const wrapper = renderChart()
    fireEvent.pointerMove(wrapper, { clientX: 160 })
    fireEvent.pointerLeave(wrapper)
    expect(screen.queryByText(/JUL/)).toBeNull()
  })
})
