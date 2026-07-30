// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MyShowsTabs } from './MyShowsTabs'
import { HISTORY_COPY } from './definitions/copy'
import { unlockTierNameFor } from './lib/unlock-tier'

afterEach(cleanup)

const COPY = HISTORY_COPY.tabs

// Derived, never named — the tier that unlocks History has moved once (#1225).
const TIER_NAME = unlockTierNameFor('concert-history')
if (TIER_NAME === null) throw new Error('concert-history unlocks no tier')

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

  it('carries the tier chip on the History tab only', () => {
    render(<MyShowsTabs active="history" />)

    expect(screen.getAllByText(COPY.tierChip(TIER_NAME))).toHaveLength(1)
  })
})
