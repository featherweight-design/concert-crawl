// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FirstWatchNudge } from './FirstWatchNudge'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.firstWatchNudge

describe('FirstWatchNudge', () => {
  it('renders the nudge copy', () => {
    render(<FirstWatchNudge onConnect={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(COPY.eyebrow)).toBeTruthy()
    expect(screen.getByText(COPY.title)).toBeTruthy()
    expect(screen.getByText(COPY.body)).toBeTruthy()
    expect(
      screen.getByRole('complementary', { name: COPY.ariaLabel }),
    ).toBeTruthy()
  })

  it('fires onConnect from the primary CTA', () => {
    const onConnect = vi.fn()
    render(<FirstWatchNudge onConnect={onConnect} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.primaryCta }))
    expect(onConnect).toHaveBeenCalledTimes(1)
  })

  it('fires onDismiss from both ✕ and "Not now"', () => {
    const onDismiss = vi.fn()
    render(<FirstWatchNudge onConnect={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: COPY.dismissAria }))
    fireEvent.click(screen.getByRole('button', { name: COPY.secondaryCta }))
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })
})
