// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReportSheet } from './ReportSheet'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.reportSheet

const renderSheet = () =>
  render(
    <ReportSheet
      open
      onClose={vi.fn()}
      liveStatus={null}
      eventDate="2026-09-01T02:00:00.000Z"
      onSelect={vi.fn()}
    />,
  )

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

describe('ReportSheet', () => {
  afterEach(cleanup)

  it('says why Continue is disabled before a type is picked', () => {
    renderSheet()

    const continueButton = screen.getByRole('button', {
      name: copy.continueButton,
    })
    expect(continueButton.hasAttribute('disabled')).toBe(true)

    const hint = screen.getByText(copy.continueHint)
    expect(continueButton.getAttribute('aria-describedby')).toBe(hint.id)
  })

  it('drops the hint and enables Continue once a type is picked', () => {
    renderSheet()

    fireEvent.click(screen.getByText(copy.options.cancelled.title))

    const continueButton = screen.getByRole('button', {
      name: copy.continueButton,
    })
    expect(continueButton.hasAttribute('disabled')).toBe(false)
    expect(continueButton.getAttribute('aria-describedby')).toBe(null)
    expect(screen.queryByText(copy.continueHint)).toBe(null)
  })
})
