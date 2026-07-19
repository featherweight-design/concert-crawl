// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

import { EmptyDenverMatchModal } from './EmptyDenverMatchModal'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.emptyDenverMatch

describe('EmptyDenverMatchModal', () => {
  it('renders the empty-match copy with the artist count', () => {
    render(
      <EmptyDenverMatchModal
        open
        artistCount={34}
        onWatch={vi.fn()}
        onBrowse={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(COPY.title)).toBeTruthy()
    expect(screen.getByText(COPY.eyebrow(34))).toBeTruthy()
    expect(screen.getByText(COPY.body(34))).toBeTruthy()
  })

  it('routes the primary and secondary actions', () => {
    const onWatch = vi.fn()
    const onBrowse = vi.fn()
    render(
      <EmptyDenverMatchModal
        open
        artistCount={34}
        onWatch={onWatch}
        onBrowse={onBrowse}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.primaryCta }))
    expect(onWatch).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: COPY.secondaryCta }))
    expect(onBrowse).toHaveBeenCalledTimes(1)
  })
})
