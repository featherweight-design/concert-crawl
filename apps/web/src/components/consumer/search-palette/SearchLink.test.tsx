// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { SearchLink } from './SearchLink'
import { SearchPaletteContext } from './search-palette-context'
import { SEARCH_HREF } from './definitions/constants'

afterEach(cleanup)

const LABEL = 'Find artists'

describe('SearchLink', () => {
  it('opens the palette instead of navigating on a plain click', () => {
    const open = vi.fn()
    render(
      <SearchPaletteContext.Provider value={{ open }}>
        <SearchLink>{LABEL}</SearchLink>
      </SearchPaletteContext.Provider>,
    )

    const link = screen.getByRole('link', { name: LABEL })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(link, event)

    expect(open).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  // A modified click means "somewhere else", and the palette has no somewhere
  // else to open in — so the href has to survive.
  it('leaves modified clicks to the browser', () => {
    const open = vi.fn()
    render(
      <SearchPaletteContext.Provider value={{ open }}>
        <SearchLink>{LABEL}</SearchLink>
      </SearchPaletteContext.Provider>,
    )

    const link = screen.getByRole('link', { name: LABEL })
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        [modifier]: true,
      })
      fireEvent(link, event)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(open).not.toHaveBeenCalled()
  })

  // No provider is the render-outside-the-app-shell case. It degrades to a real
  // navigation rather than a dead control.
  it('stays a working link when no provider is above it', () => {
    render(<SearchLink>{LABEL}</SearchLink>)

    const link = screen.getByRole('link', { name: LABEL })
    expect(link).toHaveAttribute('href', SEARCH_HREF)

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    fireEvent(link, event)
    expect(event.defaultPrevented).toBe(false)
  })
})
