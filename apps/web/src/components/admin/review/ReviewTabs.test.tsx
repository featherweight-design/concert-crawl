// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewTabs, type ReviewTabDescriptor } from './ReviewTabs'

const TABS: ReadonlyArray<ReviewTabDescriptor> = [
  { key: 'event-flags', label: 'Event flags', count: 3 },
  { key: 'prices', label: 'Prices', count: 5 },
  { key: 'all-events', label: 'All events' },
]

describe('ReviewTabs', () => {
  it('renders every tab label and its count badge when count > 0', () => {
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={() => {}} />,
    )
    expect(screen.getByRole('tab', { name: /Event flags/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Prices/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /All events/ })).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('marks the active tab with aria-selected="true" and others with "false"', () => {
    render(<ReviewTabs tabs={TABS} activeTab="prices" onChange={() => {}} />)
    expect(
      screen
        .getByRole('tab', { name: /Event flags/ })
        .getAttribute('aria-selected'),
    ).toBe('false')
    expect(
      screen.getByRole('tab', { name: /Prices/ }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('fires onChange with the tab key when an inactive tab is clicked', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /Prices/ }))
    expect(onChange).toHaveBeenCalledWith('prices')
  })

  it('moves focus to the next tab on ArrowRight and wraps to first', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    const lastTab = screen.getByRole('tab', { name: /All events/ })
    lastTab.focus()
    fireEvent.keyDown(lastTab, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('event-flags')
  })

  it('moves focus to the previous tab on ArrowLeft and wraps to last', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    const firstTab = screen.getByRole('tab', { name: /Event flags/ })
    firstTab.focus()
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('all-events')
  })

  it('activates the focused tab on Enter and Space', () => {
    const onChange = vi.fn()
    render(
      <ReviewTabs tabs={TABS} activeTab="event-flags" onChange={onChange} />,
    )
    const pricesTab = screen.getByRole('tab', { name: /Prices/ })
    pricesTab.focus()
    fireEvent.keyDown(pricesTab, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('prices')
    onChange.mockClear()
    fireEvent.keyDown(pricesTab, { key: ' ' })
    expect(onChange).toHaveBeenCalledWith('prices')
  })

  it('exposes role="tablist" on the container with the provided aria-label', () => {
    render(
      <ReviewTabs
        tabs={TABS}
        activeTab="event-flags"
        onChange={() => {}}
        aria-label="Review sections"
      />,
    )
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe(
      'Review sections',
    )
  })
})
