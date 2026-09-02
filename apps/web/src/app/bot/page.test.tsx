// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from '@testing-library/react'

import { THEMES } from '@/theme/themes'

import { CopyBlock } from './CopyBlock'
import BotPage, { metadata } from './page'
import { BOT_COPY, BOT_UA } from './definitions/copy'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('/bot', () => {
  it('renders without a session', () => {
    render(<BotPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: BOT_COPY.h1 }),
    ).toBeTruthy()
    expect(screen.getByText(BOT_UA)).toBeTruthy()
  })

  // The page our own user agent advertises has to be findable. The /legal pages
  // each opt out of indexing and this one must never inherit that by copy-paste.
  it('does not opt out of search indexing', () => {
    expect(metadata.robots).toBeUndefined()
  })

  // applyTheme writes tokens as inline styles on <html>, so the wrapper has to
  // carry Light's own values rather than relying on a data-theme attribute.
  it('pins Light by declaring its tokens on the wrapper', () => {
    render(<BotPage />)

    const root = screen.getByTestId('bot-page-root')

    expect(root.style.getPropertyValue('--bg')).toBe(THEMES.light.bg)
    expect(root.style.getPropertyValue('--fg')).toBe(THEMES.light.fg)
  })

  it('states the JavaScript behaviour we actually have', () => {
    render(<BotPage />)

    expect(screen.getByText(BOT_COPY.facts.javascript.value)).toBeTruthy()
  })
})

describe('CopyBlock', () => {
  it('confirms only once the clipboard write resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CopyBlock lines={['a', 'b']} ariaLabel="Copy it" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy it' }))

    expect(writeText).toHaveBeenCalledWith('a\nb')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy it' }).textContent).toBe(
        BOT_COPY.copyButton.copied,
      ),
    )
    // The button keeps its accessible name through the swap, so the live region
    // is the only thing that tells a screen reader the copy landed.
    expect(screen.getByRole('status').textContent).toBe(
      BOT_COPY.copyButton.copied,
    )
  })

  // A "Copied" that lied would send an operator away with an empty clipboard and
  // no reason to look at the selectable text next to the button.
  it('stays idle when the clipboard write rejects', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    render(<CopyBlock lines={['a']} ariaLabel="Copy it" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy it' }))

    await waitFor(() => expect(console.warn).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Copy it' }).textContent).toBe(
      BOT_COPY.copyButton.idle,
    )
    expect(screen.getByRole('status').textContent).toBe('')
  })
})
