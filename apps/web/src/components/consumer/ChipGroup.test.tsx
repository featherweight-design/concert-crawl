// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ChipGroup } from './ChipGroup'

afterEach(() => {
  cleanup()
})

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
]

describe('ChipGroup', () => {
  it('renders the label without an asterisk when req is omitted', () => {
    render(
      <ChipGroup
        label="Vendor"
        options={options}
        value={null}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Vendor')).toBeDefined()
    expect(screen.queryByText('*')).toBeNull()
  })

  it('renders an accent-colored asterisk after the label when req=true', () => {
    render(
      <ChipGroup
        label="Vendor"
        options={options}
        value={null}
        onChange={vi.fn()}
        req
      />,
    )
    const asterisk = screen.getByText('*') as HTMLElement
    expect(asterisk).toBeDefined()
    // The asterisk uses var(--accent) per FormLabel `req` contract (property
    // table §3 "Vendor block — DEMOTED BUT REQUIRED" + copy.ts:1111 note).
    expect(asterisk.style.color).toBe('var(--accent)')
  })

  it('marks the asterisk aria-hidden so screen readers do not announce it', () => {
    render(
      <ChipGroup
        label="Vendor"
        options={options}
        value={null}
        onChange={vi.fn()}
        req
      />,
    )
    const asterisk = screen.getByText('*')
    expect(asterisk.getAttribute('aria-hidden')).toBe('true')
  })
})
