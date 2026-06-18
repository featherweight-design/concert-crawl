// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MissingRowMenu } from './MissingRowMenu'

describe('MissingRowMenu', () => {
  it('renders three labelled buttons', () => {
    render(
      <MissingRowMenu
        eventId="evt-1"
        onMarkPostponed={() => {}}
        onMarkCancelled={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /Postponed/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cancelled/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Dismiss/ })).toBeTruthy()
  })

  it('calls the matching handler with the eventId on click', () => {
    const onMarkPostponed = vi.fn()
    const onMarkCancelled = vi.fn()
    const onDismiss = vi.fn()
    render(
      <MissingRowMenu
        eventId="evt-42"
        onMarkPostponed={onMarkPostponed}
        onMarkCancelled={onMarkCancelled}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Postponed/ }))
    fireEvent.click(screen.getByRole('button', { name: /Cancelled/ }))
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))
    expect(onMarkPostponed).toHaveBeenCalledWith('evt-42')
    expect(onMarkCancelled).toHaveBeenCalledWith('evt-42')
    expect(onDismiss).toHaveBeenCalledWith('evt-42')
  })

  it('disables all buttons when disabled=true', () => {
    render(
      <MissingRowMenu
        eventId="evt-1"
        onMarkPostponed={() => {}}
        onMarkCancelled={() => {}}
        onDismiss={() => {}}
        disabled
      />,
    )
    expect(
      screen
        .getByRole('button', { name: /Postponed/ })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: /Cancelled/ })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: /Dismiss/ }).hasAttribute('disabled'),
    ).toBe(true)
  })
})
