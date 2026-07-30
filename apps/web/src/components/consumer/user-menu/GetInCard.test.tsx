// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { GetInCard } from './GetInCard'

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

afterEach(cleanup)

describe('GetInCard (#794)', () => {
  it('offers Sign up free as the primary action and Sign in as the secondary', () => {
    render(<GetInCard onNavigate={() => {}} />)
    const signUp = screen.getByRole('link', { name: /sign up free/i })
    expect(signUp.getAttribute('href')).toBe('/sign-up')
    expect(signUp.style.background).toBe('var(--signal)')
    expect(signUp.style.minHeight).toBe('44px')

    const signIn = screen.getByRole('link', { name: /^sign in$/i })
    expect(signIn.getAttribute('href')).toBe('/sign-in')
    // Secondary means unfilled — the card must read as one primary action.
    expect(signIn.style.background).toBe('')
  })

  it('states the guest condition without naming a person', () => {
    render(<GetInCard onNavigate={() => {}} />)
    expect(screen.getByText('NOT SIGNED IN')).toBeTruthy()
    expect(screen.getByText('Browsing as a guest')).toBeTruthy()
  })

  it('shows the anonymous disc rather than a placeholder identity', () => {
    render(<GetInCard onNavigate={() => {}} />)
    expect(screen.getByTestId('anon-disc')).toBeTruthy()
  })

  it('dismisses the menu when either link is followed', () => {
    const onNavigate = vi.fn()
    render(<GetInCard onNavigate={onNavigate} />)
    screen.getByRole('link', { name: /sign up free/i }).click()
    expect(onNavigate).toHaveBeenCalledTimes(1)
    screen.getByRole('link', { name: /^sign in$/i }).click()
    expect(onNavigate).toHaveBeenCalledTimes(2)
  })

  it('occupies the identity card footprint it replaces', () => {
    const { container } = render(<GetInCard onNavigate={() => {}} />)
    const card = container.querySelector('[data-menu-row="get-in"]')
    expect(card).not.toBeNull()
    if (!(card instanceof HTMLElement))
      throw new Error('card is not an element')
    expect(card.style.padding).toBe('14px 14px 12px')
    expect(card.style.borderBottom).toBe('1px solid var(--border)')
  })
})
