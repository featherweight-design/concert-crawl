// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AppHeader } from './AppHeader'

vi.mock('next/navigation', () => ({
  usePathname: () => '/events',
}))

vi.mock('../user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

vi.mock('../search-palette/SearchPalette', () => ({
  SearchPalette: () => null,
}))

afterEach(cleanup)

describe('AppHeader', () => {
  it('renders without rightSlots when none provided', () => {
    render(<AppHeader />)
    expect(screen.getAllByLabelText(/search/i).length).toBeGreaterThan(0)
  })

  it('renders provided rightSlots into the top-right chrome', () => {
    render(
      <AppHeader
        rightSlots={
          <button type="button" data-testid="install-slot">
            Install
          </button>
        }
      />,
    )
    // The slot appears in BOTH mobile and desktop layouts so it's reachable
    // regardless of viewport — the responsive display: none rules hide the
    // other bar, not the absence of the slot.
    expect(screen.getAllByTestId('install-slot').length).toBeGreaterThan(0)
  })
})
