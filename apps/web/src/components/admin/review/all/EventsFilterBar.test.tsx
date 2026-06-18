// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EventsFilterBar } from './EventsFilterBar'
import { EMPTY_FILTERS, type AllEventsFilters } from './filters'

const setup = (initial: AllEventsFilters = EMPTY_FILTERS) => {
  const onChange = vi.fn<(next: AllEventsFilters) => void>()
  render(<EventsFilterBar filters={initial} onChange={onChange} />)
  return { onChange }
}

describe('EventsFilterBar', () => {
  it('renders the search input with the current value', () => {
    setup({ ...EMPTY_FILTERS, query: 'lord huron' })
    const input = screen.getByLabelText('Search events') as HTMLInputElement
    expect(input.value).toBe('lord huron')
  })

  it('emits onChange with updated query when typing in the search input', () => {
    const { onChange } = setup()
    fireEvent.change(screen.getByLabelText('Search events'), {
      target: { value: 'spoon' },
    })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'spoon' }),
    )
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
