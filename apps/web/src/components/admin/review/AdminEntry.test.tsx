// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminEntry, type AdminEntryProps } from './AdminEntry'

// Base props mirror the original/parent side of a contest in the design
// reference (dispute-surfaces.jsx:746–767). Tests override only the
// fields under examination so the visual contract stays pinned across
// the suite.
const baseProps: AdminEntryProps = {
  side: 'original',
  priceMin: '48',
  priceMax: '58',
  tier: 'GA',
  vendor: 'AXS',
  sourceCategory: 'standard',
  submitter: { handle: 'hugh' },
  observedAt: '2026-06-20T00:00:00Z',
  confirms: { fans: 2, admin: 0 },
  note: null,
  winner: null,
}

describe('AdminEntry', () => {
  // Design property table §3b line 208 — price.format =
  // FormatRange(floor, ceiling). Range renders when ceiling > floor.
  it('renders price range when ceiling > floor', () => {
    render(<AdminEntry {...baseProps} />)
    expect(screen.getByText('$48–$58')).toBeTruthy()
  })

  // Same row — when ceiling === null, the range collapses to a single
  // dollar amount with no dash.
  it('renders single price when ceiling is null', () => {
    render(<AdminEntry {...baseProps} priceMax={null} />)
    expect(screen.getByText('$48')).toBeTruthy()
  })

  // Design property table §3b lines 211–213 — tier renders mono
  // uppercase. The text content is the raw tier string.
  it('renders tier text', () => {
    render(<AdminEntry {...baseProps} tier="VIP" />)
    expect(screen.getByText('VIP')).toBeTruthy()
  })

  // Design property table §3b line 201 — winner badge text = "winner".
  // Only renders when side === winner.
  it('renders winner badge when side matches winner', () => {
    render(<AdminEntry {...baseProps} winner="original" />)
    expect(screen.getByText(/winner/i)).toBeTruthy()
  })

  // Same row — when the OTHER side won, this card stays muted (no
  // badge, no accent border).
  it('does not render winner badge when winner is the other side', () => {
    render(<AdminEntry {...baseProps} side="original" winner="counter" />)
    expect(screen.queryByText(/winner/i)).toBeNull()
  })

  // Same row — when winner is null (no resolution yet), neither side
  // gets the badge.
  it('does not render winner badge when winner is null', () => {
    render(<AdminEntry {...baseProps} winner={null} />)
    expect(screen.queryByText(/winner/i)).toBeNull()
  })

  // Design property table §3b lines 199–200 — winner card gets a
  // 2px solid accent border; non-winner cards get 1px solid var(--border).
  // Pin this via inline style assertion on the container. The container
  // root is the card itself; using `instanceof HTMLElement` keeps the
  // style read type-safe without an `as` cast (memory:feedback_no_type_casting).
  const readCardBorder = (container: HTMLElement): string => {
    const card = container.firstElementChild
    if (!(card instanceof HTMLElement)) {
      throw new Error('AdminEntry root did not render as an HTMLElement')
    }
    return card.style.border
  }

  it('applies the 2px winner border when winner === side', () => {
    const { container } = render(
      <AdminEntry {...baseProps} winner="original" />,
    )
    expect(readCardBorder(container).includes('2px solid')).toBe(true)
  })

  it('applies the 1px default border when winner is null', () => {
    const { container } = render(<AdminEntry {...baseProps} winner={null} />)
    const border = readCardBorder(container)
    expect(border.includes('1px solid')).toBe(true)
    expect(border.includes('2px')).toBe(false)
  })

  // Design property table §3b lines 225–232 — note block renders when
  // note !== null; the note text is wrapped in curly quotes per the
  // design's `"{note}"` format.
  it('renders quoted italic note when present', () => {
    render(<AdminEntry {...baseProps} note="Standing GA verified on AXS." />)
    expect(screen.getByText(/standing GA verified/i)).toBeTruthy()
  })

  it('omits note block entirely when note is null', () => {
    const { container } = render(<AdminEntry {...baseProps} note={null} />)
    // The design's note format wraps content in U+201C / U+201D curly
    // quotes; their absence is the cleanest proof the block didn't
    // render at all.
    expect(container.textContent?.includes('“')).toBe(false)
    expect(container.textContent?.includes('”')).toBe(false)
  })

  // Design property table §3b lines 217–223 — metadata grid surfaces
  // all four labels. The values appear in adjacent grid cells.
  it('renders the metadata grid with all four labels', () => {
    render(<AdminEntry {...baseProps} />)
    expect(screen.getByText('Submitter')).toBeTruthy()
    expect(screen.getByText('Vendor')).toBeTruthy()
    expect(screen.getByText('Observed')).toBeTruthy()
    expect(screen.getByText('Confirms')).toBeTruthy()
  })

  // Design property table §3b line 218 — submitter value renders the
  // handle directly. Null handles fall back to "anonymous" so the row
  // never collapses to an empty cell.
  it('renders submitter handle in metadata grid', () => {
    render(<AdminEntry {...baseProps} submitter={{ handle: 'hugh' }} />)
    expect(screen.getByText('hugh')).toBeTruthy()
  })

  it('falls back to "anonymous" when submitter handle is null', () => {
    render(<AdminEntry {...baseProps} submitter={{ handle: null }} />)
    expect(screen.getByText('anonymous')).toBeTruthy()
  })

  // Design property table §3b line 224 — confirms value is a free-form
  // string. With admin === 0, only the fan count surfaces.
  it('renders confirms as "{fans} fans" when admin === 0', () => {
    render(<AdminEntry {...baseProps} confirms={{ fans: 2, admin: 0 }} />)
    expect(screen.getByText('2 fans')).toBeTruthy()
  })

  // Same row — when admin > 0, both counts surface joined by " · ".
  it('renders confirms as "{fans} fans · {admin} admin" when admin > 0', () => {
    render(<AdminEntry {...baseProps} confirms={{ fans: 3, admin: 1 }} />)
    expect(screen.getByText('3 fans · 1 admin')).toBeTruthy()
  })

  // Design property table §3b line 220 — vendor value renders the
  // vendor string directly (no badge wrapper at this layer; trust pill
  // is separate).
  it('renders vendor in metadata grid', () => {
    render(<AdminEntry {...baseProps} vendor="Ticketmaster" />)
    expect(screen.getByText('Ticketmaster')).toBeTruthy()
  })
})
