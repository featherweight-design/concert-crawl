// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MetaRow } from './MetaRow'
import type { ChipSpec } from './lib/row-chips'

// jsdom has no layout engine, so the fit pass is given one: every chip is as
// wide as its own text, and the box is as wide as the case under test. That is
// enough to price the collapse against the drop, which is the only decision
// this component makes.
const PER_CHAR = 10

function stubGeometry(available: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function mockRect(this: HTMLElement) {
      const width = this.classList.contains('meta-box')
        ? available
        : (this.textContent?.length ?? 0) * PER_CHAR
      return new DOMRect(0, 0, width, 16)
    },
  )
}

const CHIPS: ChipSpec[] = [
  {
    key: 'genre-garage rock',
    label: 'garage rock',
    tone: 'neutral',
    secondaryLabel: 'indie',
  },
  { key: 'following', label: 'Following', tone: 'strong' },
]

function renderRow(available: number) {
  stubGeometry(available)
  render(<MetaRow chips={CHIPS} budget={2} className="meta-box" />)
  return screen.getByTestId('row-meta')
}

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('MetaRow', () => {
  it('keeps the genre pair whole when the column can hold it', () => {
    const row = renderRow(400)
    expect(row.textContent).toContain('garage rock/indie')
    expect(row.children).toHaveLength(2)
  })

  it('collapses the pair to its first half before it drops a chip', () => {
    // The paired set needs 265px and the collapsed one 205px, so 220 is the
    // width where the cheaper concession is the only one required.
    const row = renderRow(220)
    expect(row.textContent).not.toContain('/')
    expect(row.textContent).toContain('garage rock')
    expect(row.children).toHaveLength(2)
  })

  it('drops the trailing chip once collapsing is not enough', () => {
    const row = renderRow(150)
    expect(row.children).toHaveLength(1)
    expect(row.textContent).not.toContain('Following')
  })

  it('tells a screen reader the genre the row stopped drawing', () => {
    renderRow(220)
    expect(screen.getByText('and indie')).toBeDefined()
  })
})
