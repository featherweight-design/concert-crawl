// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingClientShell from './LandingClientShell'
import type { LandingShow } from '@/components/brand/landing-poster/LandingPoster'

const SHOWS: LandingShow[] = [
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    artist: 'Amyl and The Sniffers',
    venue: 'Ogden Theatre',
    city: 'Denver, CO',
    date: '2026-09-01',
    dateShort: 'SEP 01',
    showTime: '8pm',
    opener: null,
    state: null,
    href: '/events/aaaaaaaa-0000-4000-8000-000000000001',
  },
  {
    id: 'aaaaaaaa-0000-4000-8000-000000000002',
    artist: 'Wednesday',
    venue: 'Globe Hall',
    city: 'Denver, CO',
    date: '2026-09-03',
    dateShort: 'SEP 03',
    showTime: '9pm',
    opener: null,
    state: null,
    href: '/events/aaaaaaaa-0000-4000-8000-000000000002',
  },
]

describe('LandingClientShell — public CTAs (#794)', () => {
  it('renders Browse shows as the primary CTA pointing at /events', () => {
    render(<LandingClientShell shows={SHOWS} />)
    const browse = screen.getByRole('link', { name: /browse shows/i })
    expect(browse.getAttribute('href')).toBe('/events')
  })

  it('renders Sign up as the secondary CTA pointing at /sign-up', () => {
    render(<LandingClientShell shows={SHOWS} />)
    const signUp = screen.getByRole('link', { name: /^sign up$/i })
    expect(signUp.getAttribute('href')).toBe('/sign-up')
  })

  it('reassures that no account is needed to look around', () => {
    render(<LandingClientShell shows={SHOWS} />)
    expect(screen.getByText(/no account needed to look around/i)).toBeTruthy()
  })

  it('does not render the beta code or waitlist CTAs', () => {
    render(<LandingClientShell shows={SHOWS} />)
    expect(screen.queryByText(/i have a code/i)).toBeNull()
    expect(screen.queryByText(/waitlist/i)).toBeNull()
    expect(screen.queryByText(/private beta/i)).toBeNull()
    expect(document.querySelector('a[href="/auth/code"]')).toBeNull()
  })

  it('renders exactly one Sign in link, in the top bar', () => {
    render(<LandingClientShell shows={SHOWS} />)
    const signIn = screen.getByRole('link', { name: /sign in/i })
    expect(signIn.getAttribute('href')).toBe('/sign-in')
    expect(signIn.closest('header')).not.toBeNull()
  })

  it('links to the full week with the server-supplied count', () => {
    render(<LandingClientShell shows={SHOWS} showCount={214} />)
    const seeAll = screen.getByRole('link', {
      name: /see all 214 shows this week/i,
    })
    expect(seeAll.getAttribute('href')).toBe('/events')
  })

  it('falls back to a countless see-all line when no count is known', () => {
    render(<LandingClientShell shows={SHOWS} showCount={null} />)
    expect(
      screen.getByRole('link', { name: /^see all shows this week/i }),
    ).toBeTruthy()
    expect(screen.queryByText(/see all \d+ shows/i)).toBeNull()
  })
})
