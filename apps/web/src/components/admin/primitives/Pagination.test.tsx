// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Pagination } from './Pagination'

beforeEach(() => {
  cleanup()
})

const renderPager = (
  override: Partial<React.ComponentProps<typeof Pagination>> = {},
) => {
  const onPageChange = vi.fn<(next: number) => void>()
  const onPageSizeChange = vi.fn<(next: number) => void>()
  render(
    <Pagination
      page={1}
      pageSize={20}
      total={100}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      // forceCompact=false skips the ResizeObserver path so JSDOM tests don't
      // need to mock it. The compact-mode test forces it on explicitly.
      forceCompact={false}
      {...override}
    />,
  )
  return { onPageChange, onPageSizeChange }
}

describe('<Pagination /> — desktop (full) mode', () => {
  it('disables First + Previous on page 1', () => {
    renderPager({ page: 1, pageSize: 20, total: 100 })
    expect(
      (screen.getByLabelText('First page') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByLabelText('Previous page') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('disables Next + Last on the final page', () => {
    renderPager({ page: 5, pageSize: 20, total: 100 })
    expect(
      (screen.getByLabelText('Next page') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByLabelText('Last page') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('marks the current page button with aria-current=page', () => {
    renderPager({ page: 3, pageSize: 20, total: 100 })
    expect(screen.getByLabelText('Page 3').getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByLabelText('Page 2').getAttribute('aria-current')).toBe(
      null,
    )
  })

  it('emits onPageChange when a numbered page is clicked', () => {
    const { onPageChange } = renderPager({
      page: 1,
      pageSize: 20,
      total: 200,
    })
    fireEvent.click(screen.getByLabelText('Page 2'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('emits onPageChange(1) when First is clicked from a middle page', () => {
    const { onPageChange } = renderPager({ page: 5, pageSize: 20, total: 200 })
    fireEvent.click(screen.getByLabelText('First page'))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('renders the range readout for the current page', () => {
    renderPager({ page: 3, pageSize: 20, total: 100 })
    expect(screen.getByText(/41[–-]60/)).toBeTruthy()
    expect(screen.getByText('100')).toBeTruthy()
  })

  it('renders "No results" when total is 0', () => {
    renderPager({ page: 1, pageSize: 20, total: 0, itemLabel: 'events' })
    expect(screen.getByText('No events')).toBeTruthy()
  })

  it('renders the size selector and emits onPageSizeChange when an option is picked', () => {
    const { onPageSizeChange } = renderPager({
      page: 1,
      pageSize: 20,
      total: 200,
    })
    fireEvent.click(screen.getByLabelText('Rows per page'))
    fireEvent.click(screen.getByRole('option', { name: /50/ }))
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })
})

describe('<Pagination /> — compact (mobile) mode', () => {
  it('shows Prev / Page X / Y / Next instead of the numbered window', () => {
    renderPager({
      page: 2,
      pageSize: 20,
      total: 200,
      forceCompact: true,
    })
    expect(screen.getByText(/Page 2/)).toBeTruthy()
    expect(screen.queryByLabelText('Page 5')).toBeNull()
  })

  it('does not render First/Last in compact mode', () => {
    renderPager({
      page: 2,
      pageSize: 20,
      total: 200,
      forceCompact: true,
    })
    expect(screen.queryByLabelText('First page')).toBeNull()
    expect(screen.queryByLabelText('Last page')).toBeNull()
  })
})
