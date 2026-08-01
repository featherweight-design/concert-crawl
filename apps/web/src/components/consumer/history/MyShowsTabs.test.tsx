// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MyShowsTabs } from './MyShowsTabs'
import { HISTORY_COPY } from './definitions/copy'

afterEach(cleanup)

const COPY = HISTORY_COPY.tabs

describe('MyShowsTabs', () => {
  it('renders both tabs as links to their routes', () => {
    render(<MyShowsTabs active="watching" />)

    expect(screen.getByRole('link', { name: COPY.watching })).toHaveAttribute(
      'href',
      '/watching',
    )
    expect(
      screen.getByRole('link', { name: new RegExp(COPY.history) }),
    ).toHaveAttribute('href', '/history')
  })

  it('marks Watching as the current page when active', () => {
    render(<MyShowsTabs active="watching" />)

    expect(screen.getByRole('link', { name: COPY.watching })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('link', { name: new RegExp(COPY.history) }),
    ).not.toHaveAttribute('aria-current')
  })

  it('marks History as the current page when active', () => {
    render(<MyShowsTabs active="history" />)

    expect(
      screen.getByRole('link', { name: new RegExp(COPY.history) }),
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

  // The locked takeover is where an unentitled user meets the price; the tab
  // itself never names a tier.
  it('carries no tier chip on either tab', () => {
    render(<MyShowsTabs active="history" />)

    // Match the chip's shape ("+ <tier>"), not one tier's name — renaming the
    // tier shouldn't let the chip regress past this test.
    expect(screen.queryByText(/^\+\s*\S/)).toBeNull()
    expect(screen.getByRole('link', { name: COPY.history })).toBeInTheDocument()
  })
})
