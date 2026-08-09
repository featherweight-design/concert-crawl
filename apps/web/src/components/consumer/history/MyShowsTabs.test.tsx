// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MyShowsTabs } from './MyShowsTabs'
import { HISTORY_COPY } from './definitions/copy'

afterEach(cleanup)

const COPY = HISTORY_COPY.tabs

describe('MyShowsTabs', () => {
  it('renders all three tabs as links to their routes', () => {
    render(<MyShowsTabs active="watching" />)

    expect(screen.getByRole('link', { name: COPY.watching })).toHaveAttribute(
      'href',
      '/watching',
    )
    expect(
      screen.getByRole('link', { name: new RegExp(COPY.concerts) }),
    ).toHaveAttribute('href', '/history')
    expect(
      screen.getByRole('link', { name: new RegExp(COPY.artists) }),
    ).toHaveAttribute('href', '/following')
  })

  it('marks Watching as the current page when active', () => {
    render(<MyShowsTabs active="watching" />)

    expect(screen.getByRole('link', { name: COPY.watching })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('link', { name: new RegExp(COPY.concerts) }),
    ).not.toHaveAttribute('aria-current')
  })

  it('marks Concerts as the current page when active', () => {
    render(<MyShowsTabs active="history" />)

    expect(
      screen.getByRole('link', { name: new RegExp(COPY.concerts) }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: COPY.watching }),
    ).not.toHaveAttribute('aria-current')
  })

  it('labels the group so the sub-tabs are reachable as a navigation', () => {
    render(<MyShowsTabs active="history" />)

    expect(
      screen.getByRole('navigation', { name: COPY.ariaLabel }),
    ).toBeInTheDocument()
  })

  it('marks Artists as the current page when active', () => {
    render(<MyShowsTabs active="artists" />)

    expect(
      screen.getByRole('link', { name: new RegExp(COPY.artists) }),
    ).toHaveAttribute('aria-current', 'page')
  })

  // ACC-02: the count rides the accessible name rather than being a second
  // announced node beside the label.
  it('carries the follow count inside the Artists accessible name', () => {
    render(<MyShowsTabs active="artists" artistCount={7} />)

    expect(
      screen.getByRole('link', { name: COPY.tabCountAria(COPY.artists, 7) }),
    ).toHaveAttribute('href', '/following')
  })

  // AMB-04: zero is not a number worth announcing, and the prototype only ever
  // draws the count on the active tab.
  it('omits the count entirely at zero', () => {
    render(<MyShowsTabs active="artists" artistCount={0} />)

    expect(screen.getByRole('link', { name: COPY.artists })).toBeInTheDocument()
    expect(screen.queryByText('0')).toBeNull()
  })

  it('renders no count on the Artists tab while it is inactive', () => {
    render(<MyShowsTabs active="watching" artistCount={7} />)

    expect(screen.getByRole('link', { name: COPY.artists })).toBeInTheDocument()
    expect(screen.queryByText('7')).toBeNull()
  })

  // The locked takeover is where an unentitled user meets the price; the tab
  // itself never names a tier.
  it('carries no tier chip on either tab', () => {
    render(<MyShowsTabs active="history" />)

    // Match the chip's shape ("+ <tier>"), not one tier's name — renaming the
    // tier shouldn't let the chip regress past this test.
    expect(screen.queryByText(/^\+\s*\S/)).toBeNull()
    expect(
      screen.getByRole('link', { name: COPY.concerts }),
    ).toBeInTheDocument()
  })
})
