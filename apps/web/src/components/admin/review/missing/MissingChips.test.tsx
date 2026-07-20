// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MissingChips } from './MissingChips'

const BASE_PROPS = {
  classification: 'crawl_gap' as const,
  clusterCount: 1,
  venueName: 'Mission Ballroom',
}

describe('MissingChips', () => {
  it('renders pluralised missed-sweep label and the cadence label', () => {
    render(<MissingChips {...BASE_PROPS} missedCount={3} />)
    expect(screen.getByText('missed 3 sweeps')).toBeTruthy()
    expect(screen.getByText('expected daily')).toBeTruthy()
  })

  it('uses singular label when missed count is 1', () => {
    render(<MissingChips {...BASE_PROPS} missedCount={1} />)
    expect(screen.getByText('missed 1 sweep')).toBeTruthy()
  })

  it('uses warning-coloured chip when missed count < 4', () => {
    render(<MissingChips {...BASE_PROPS} missedCount={3} />)
    expect(screen.getByText('missed 3 sweeps').style.color).toBe(
      'var(--warning)',
    )
  })

  it('escalates the missed chip to danger when count >= 4', () => {
    render(<MissingChips {...BASE_PROPS} missedCount={4} />)
    expect(screen.getByText('missed 4 sweeps').style.color).toBe(
      'var(--danger)',
    )
  })

  it('renders the classification badge', () => {
    render(<MissingChips {...BASE_PROPS} missedCount={2} />)
    expect(screen.getByText('Possible crawl gap')).toBeTruthy()
  })

  it('renders removed classification badge', () => {
    render(
      <MissingChips {...BASE_PROPS} classification="removed" missedCount={2} />,
    )
    expect(screen.getByText('Likely removed')).toBeTruthy()
  })

  it('renders duplicate classification badge', () => {
    render(
      <MissingChips
        {...BASE_PROPS}
        classification="duplicate"
        missedCount={2}
      />,
    )
    expect(screen.getByText('Possible duplicate')).toBeTruthy()
  })

  it('does not render cluster badge when clusterCount < 3', () => {
    render(<MissingChips {...BASE_PROPS} clusterCount={2} missedCount={2} />)
    expect(screen.queryByText(/missing at/)).toBeNull()
  })

  it('renders cluster badge when clusterCount >= 3', () => {
    render(<MissingChips {...BASE_PROPS} clusterCount={3} missedCount={2} />)
    expect(screen.getByText('3 missing at Mission Ballroom')).toBeTruthy()
  })

  it('renders cluster badge with em-dash when venueName is null', () => {
    render(
      <MissingChips
        {...BASE_PROPS}
        clusterCount={4}
        venueName={null}
        missedCount={2}
      />,
    )
    expect(screen.getByText('4 missing at —')).toBeTruthy()
  })
})
