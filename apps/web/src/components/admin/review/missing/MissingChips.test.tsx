// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MissingChips } from './MissingChips'

describe('MissingChips', () => {
  it('renders pluralised missed-sweep label and the cadence label', () => {
    render(<MissingChips missedCount={3} />)
    expect(screen.getByText('missed 3 sweeps')).toBeTruthy()
    expect(screen.getByText('expected daily')).toBeTruthy()
  })

  it('uses singular label when missed count is 1', () => {
    render(<MissingChips missedCount={1} />)
    expect(screen.getByText('missed 1 sweep')).toBeTruthy()
  })

  it('uses warning-coloured chip when missed count < 4', () => {
    render(<MissingChips missedCount={3} />)
    expect(screen.getByText('missed 3 sweeps').style.color).toBe(
      'var(--warning)',
    )
  })

  it('escalates the missed chip to danger when count >= 4', () => {
    render(<MissingChips missedCount={4} />)
    expect(screen.getByText('missed 4 sweeps').style.color).toBe(
      'var(--danger)',
    )
  })
})
