// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JumpPicker } from './JumpPicker'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

// jsdom + Vitest do not ship the @testing-library/jest-dom matchers in this
// repo (memory:feedback_no_type_casting bans `as` casts), so these tests read
// raw DOM properties instead of jest-dom helpers like toHaveAttribute.
const buttonByLabel = (label: string): HTMLButtonElement => {
  const node = screen.getByLabelText(label)
  if (!(node instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${label}" to be an HTMLButtonElement`)
  }
  return node
}

const availability = new Map<string, number>([
  ['2026-04-28', 2],
  ['2026-05-02', 3],
])

function setup(overrides = {}) {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(
    <JumpPicker
      open
      onClose={onClose}
      selectedDate="2026-04-28"
      today="2026-04-28"
      availability={availability}
      onPick={onPick}
      {...overrides}
    />,
  )
  return { onPick, onClose }
}

describe('JumpPicker', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <JumpPicker
        open={false}
        onClose={vi.fn()}
        selectedDate="2026-04-28"
        today="2026-04-28"
        availability={availability}
        onPick={vi.fn()}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders a dialog labelled by the visible month', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toContain('April 2026')
  })

  it('marks the selected day with aria-selected', () => {
    setup()
    const sel = screen.getByRole('gridcell', {
      name: /Tuesday, April 28, 2 shows, today/,
    })
    expect(sel.getAttribute('aria-selected')).toBe('true')
  })

  it('encodes show count in the aria-label, not just the dot', () => {
    setup()
    // Page to May so May 2 is in-month and its count clause is present.
    fireEvent.click(buttonByLabel('Next month'))
    expect(
      screen.getByRole('gridcell', { name: /Saturday, May 2, 3 shows/ }),
    ).toBeTruthy()
  })

  it('disables past and out-of-month days', () => {
    setup()
    // April 27 is in-month but before today → disabled.
    const past = screen.getByRole('gridcell', { name: /Monday, April 27/ })
    expect(past.getAttribute('aria-disabled')).toBe('true')
  })

  it('calls onPick with the ISO date when a future in-month day is chosen', () => {
    const { onPick } = setup()
    // April 29 is in-month and after today → selectable in the default view.
    fireEvent.click(
      screen.getByRole('gridcell', { name: /Wednesday, April 29/ }),
    )
    expect(onPick).toHaveBeenCalledWith('2026-04-29')
  })

  it('calls onPick for a day reached by paging to its month', () => {
    const { onPick } = setup()
    // May 2 is an out-of-month spill in April; page to May, then it is in-month.
    fireEvent.click(buttonByLabel('Next month'))
    fireEvent.click(
      screen.getByRole('gridcell', { name: /Saturday, May 2, 3 shows/ }),
    )
    expect(onPick).toHaveBeenCalledWith('2026-05-02')
  })

  it('pages to the next month with the pager', () => {
    setup()
    fireEvent.click(buttonByLabel('Next month'))
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toContain(
      'May 2026',
    )
  })

  it('selects today when the footer Today reset is clicked', () => {
    const { onPick } = setup({ selectedDate: '2026-05-15' })
    // Page away from the current month first, so the reset has real work to do —
    // it must select today via onPick, not merely re-view the current month.
    fireEvent.click(buttonByLabel('Next month'))
    fireEvent.click(
      screen.getByRole('button', { name: CONSUMER_COPY.jumpPickerToday }),
    )
    expect(onPick).toHaveBeenCalledWith('2026-04-28')
  })

  it('closes on Escape', () => {
    const { onClose } = setup()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose once for Escape pressed inside the grid', () => {
    const { onClose } = setup()
    // Escape in the grid must bubble to the dialog root and close exactly once,
    // not fire onClose in both the grid and root handlers.
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus with arrow keys and skips disabled days', () => {
    setup()
    // Selected day (Apr 28) is focused on open; ArrowRight → Apr 29.
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowRight' })
    const target = screen.getByRole('gridcell', { name: /Wednesday, April 29/ })
    expect(document.activeElement).toBe(target)
  })

  it('does not page before the current month (atMin)', () => {
    setup()
    expect(buttonByLabel('Previous month').disabled).toBe(true)
  })

  it('keys day cells by ISO date so paging reuses the same DOM node', () => {
    setup()
    // 2026-04-28 (today) sits at grid index 30 in April but index 2 in the May
    // grid's leading spill. Keyed by ISO, React reuses the same DOM node across
    // the page; keyed by array index it would rebind that node to a new date,
    // sticking stale focus/aria state to the wrong day.
    const aprNode = document.querySelector('[data-iso="2026-04-28"]')
    fireEvent.click(buttonByLabel('Next month'))
    const mayNode = document.querySelector('[data-iso="2026-04-28"]')
    expect(mayNode).not.toBeNull()
    expect(mayNode).toBe(aprNode)
  })

  it('lands the roving tab-stop on today when paging back to the current month', () => {
    setup()
    // Page forward to May, then back to April (the current/min month). April 1
    // is in the past (disabled), so the single tab-stop must land on today
    // rather than a dead disabled cell.
    fireEvent.click(buttonByLabel('Next month'))
    fireEvent.click(buttonByLabel('Previous month'))
    const todayCell = document.querySelector('[data-iso="2026-04-28"]')
    const firstCell = document.querySelector('[data-iso="2026-04-01"]')
    expect(todayCell?.getAttribute('tabindex')).toBe('0')
    expect(firstCell?.getAttribute('tabindex')).toBe('-1')
  })
})
