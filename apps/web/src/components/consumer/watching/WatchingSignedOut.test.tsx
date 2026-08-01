// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { WatchingSignedOut } from './WatchingSignedOut'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const copy = CONSUMER_COPY.watching.signedOut

afterEach(cleanup)

describe('WatchingSignedOut (#794)', () => {
  it('issues no network request — the payload is gated, not fetched', () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    render(<WatchingSignedOut />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('defines the surface before it demonstrates it', () => {
    render(<WatchingSignedOut />)
    expect(
      screen.getByRole('heading', { name: copy.title }).textContent,
    ).toContain('Keep an eye on it.')
    expect(screen.getByText(copy.lede)).toBeTruthy()
    expect(screen.getByText(copy.eyebrow)).toBeTruthy()
  })

  it('hides the sample rows from assistive tech and offers a text alternative', () => {
    render(<WatchingSignedOut />)
    const example = screen.getByTestId('watching-example')
    expect(example.getAttribute('aria-hidden')).toBe('true')
    // With the visible caption gone, this alternative is the only thing
    // standing between a screen-reader user and mistaking these for their own
    // shows — the worst failure available on this page.
    expect(screen.getByText(copy.exampleAlt)).toBeTruthy()
  })

  it('works the example with a drop, a flat, and a sell-out', () => {
    render(<WatchingSignedOut />)
    expect(screen.getByText('−$7')).toBeTruthy()
    expect(screen.getByText('flat')).toBeTruthy()
    expect(screen.getByText('SOLD OUT')).toBeTruthy()
    // The drop carries the success tone; a colourless delta teaches nothing.
    expect(screen.getByText('−$7').style.color).toBe('var(--success)')
  })

  it('states the three facts, numbered', () => {
    render(<WatchingSignedOut />)
    for (const fact of copy.facts) {
      expect(screen.getByText(fact.key)).toBeTruthy()
      expect(screen.getByText(fact.title)).toBeTruthy()
    }
  })

  it('offers sign-up, sign-in, and a way to keep browsing', () => {
    render(<WatchingSignedOut />)
    expect(
      screen.getByRole('link', { name: copy.signUp }).getAttribute('href'),
    ).toBe('/sign-up')
    expect(
      screen.getByRole('link', { name: copy.signIn }).getAttribute('href'),
    ).toBe('/sign-in')
    // The visitor asked "what is this?" — the answer must not be a dead end.
    expect(
      screen
        .getByRole('link', { name: copy.keepBrowsing })
        .getAttribute('href'),
    ).toBe('/events')
  })

  it('never claims the visitor has no shows — that is the signed-in state', () => {
    render(<WatchingSignedOut />)
    expect(screen.queryByText(CONSUMER_COPY.watchingEmptyTitle)).toBeNull()
  })
})
