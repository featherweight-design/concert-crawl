// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EventsFilterBar } from './EventsFilterBar'
import { EMPTY_FILTERS, type AllEventsFilters } from './filters'

const setup = (initial: AllEventsFilters = EMPTY_FILTERS) => {
  const onChange = vi.fn<(next: AllEventsFilters) => void>()
  const utils = render(
    <EventsFilterBar filters={initial} onChange={onChange} />,
  )
  return { onChange, ...utils }
}

describe('EventsFilterBar', () => {
  it('renders the search input with the current value', () => {
    setup({ ...EMPTY_FILTERS, query: 'lord huron' })
    const input = screen.getByLabelText('Search events') as HTMLInputElement
    expect(input.value).toBe('lord huron')
  })

  describe('search input — debounce + threshold', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('emits onChange with the typed query after the debounce window', () => {
      const { onChange } = setup()
      fireEvent.change(screen.getByLabelText('Search events'), {
        target: { value: 'spoon' },
      })
      // Pre-debounce, parent has not been touched yet — that's the whole point.
      expect(onChange).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'spoon' }),
      )
    })

    it('preserves every typed character even with a slow parent (fast typing)', () => {
      const { onChange } = setup()
      const input = screen.getByLabelText('Search events') as HTMLInputElement
      // Simulate fast typing — change events fire in rapid succession.
      for (const value of ['y', 'yo', 'yog', 'yoga']) {
        fireEvent.change(input, { target: { value } })
      }
      // Input reflects every keystroke immediately (local state is the fix).
      expect(input.value).toBe('yoga')
      // Parent has not yet been called — still inside the debounce window.
      expect(onChange).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(300)
      })
      // Exactly one emission, with the final value.
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'yoga' }),
      )
    })

    it('does not emit for a single-character query (below threshold)', () => {
      const { onChange } = setup()
      fireEvent.change(screen.getByLabelText('Search events'), {
        target: { value: 'a' },
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(onChange).not.toHaveBeenCalled()
    })

    it('emits onChange when clearing the field to empty (so results reset)', () => {
      const { onChange } = setup({ ...EMPTY_FILTERS, query: 'yoga' })
      fireEvent.change(screen.getByLabelText('Search events'), {
        target: { value: '' },
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ query: '' }),
      )
    })

    it('syncs the input when filters.query changes externally (e.g. deep link)', () => {
      const onChange = vi.fn<(next: AllEventsFilters) => void>()
      const { rerender } = render(
        <EventsFilterBar filters={EMPTY_FILTERS} onChange={onChange} />,
      )
      const input = screen.getByLabelText('Search events') as HTMLInputElement
      expect(input.value).toBe('')
      rerender(
        <EventsFilterBar
          filters={{ ...EMPTY_FILTERS, query: 'phoebe' }}
          onChange={onChange}
        />,
      )
      expect(input.value).toBe('phoebe')
    })

    it('emits trimmed query (whitespace edges stripped before threshold check)', () => {
      const { onChange } = setup()
      fireEvent.change(screen.getByLabelText('Search events'), {
        target: { value: '  a ' },
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })
      // Trimmed length is 1 — still below threshold.
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  it('switches the verification filter via the segmented control', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Verified' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ verified: 'verified' }),
    )
  })

  it('emits dateFrom when the From input changes', () => {
    const { onChange } = setup()
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-07-01' },
    })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-07-01' }),
    )
  })

  it('adds a genre tag when the user submits the genre input', () => {
    const { onChange } = setup()
    const input = screen.getByPlaceholderText('Add genre…') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'indie' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ genre: ['indie'] }),
    )
  })

  it('removes a genre tag when the chip remove button is clicked', () => {
    const { onChange } = setup({
      ...EMPTY_FILTERS,
      genre: ['indie', 'folk'],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove indie' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ genre: ['folk'] }),
    )
  })

  it('toggles a missing-data flag on checkbox click', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('No price'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ missingData: ['no-price'] }),
    )
  })

  it('renders the active filter count and Clear all action when filters are active', () => {
    const { onChange } = setup({
      ...EMPTY_FILTERS,
      query: 'spoon',
      verified: 'verified',
    })
    expect(screen.getByText('2 active filters')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS)
  })

  it('hides Clear all and the count when no filters are active', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull()
  })
})
