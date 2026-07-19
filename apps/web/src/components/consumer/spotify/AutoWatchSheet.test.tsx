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

import { AutoWatchSheet } from './AutoWatchSheet'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.autoWatchSheet

const renderSheet = (
  overrides: Partial<React.ComponentProps<typeof AutoWatchSheet>> = {},
) =>
  render(
    <AutoWatchSheet
      open
      denverArtistCount={9}
      denverShowCount={12}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  )

describe('AutoWatchSheet', () => {
  it('defaults to highlight-only with the matching CTA', () => {
    renderSheet()
    const highlight = screen.getByRole('radio', {
      name: new RegExp(COPY.optionHighlight.head),
    })
    expect(highlight.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: COPY.ctaHighlight })).toBeTruthy()
  })

  it('switches the CTA to the auto variant when auto is selected', () => {
    renderSheet()
    fireEvent.click(
      screen.getByRole('radio', { name: new RegExp(COPY.optionAuto.head) }),
    )
    expect(screen.getByRole('button', { name: COPY.ctaAuto(12) })).toBeTruthy()
  })

  it('confirms with the selected choice', () => {
    const onConfirm = vi.fn()
    renderSheet({ onConfirm })
    fireEvent.click(screen.getByRole('button', { name: COPY.ctaHighlight }))
    expect(onConfirm).toHaveBeenCalledWith('highlight')
    fireEvent.click(
      screen.getByRole('radio', { name: new RegExp(COPY.optionAuto.head) }),
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.ctaAuto(12) }))
    expect(onConfirm).toHaveBeenCalledWith('auto')
  })

  it('dismisses via ✕ without confirming', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderSheet({ onConfirm, onClose })
    fireEvent.click(screen.getByRole('button', { name: COPY.dismissAria }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('uses singular copy for one artist and one show', () => {
    renderSheet({ denverArtistCount: 1, denverShowCount: 1 })
    expect(screen.getByText(COPY.eyebrowSingular)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('radio', { name: new RegExp(COPY.optionAuto.head) }),
    )
    expect(
      screen.getByRole('button', { name: COPY.ctaAutoSingular }),
    ).toBeTruthy()
  })
})
