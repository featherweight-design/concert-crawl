// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProvenanceCTA } from './ProvenanceCTA'

afterEach(() => {
  cleanup()
})

describe('ProvenanceCTA', () => {
  describe('kind="boxoffice"', () => {
    it('renders "Get Tickets ↗", filled signal background, gold dot + caption (vendor="Venue")', () => {
      render(
        <ProvenanceCTA
          kind="boxoffice"
          vendor="Venue"
          href="https://example.com/boxoffice"
        />,
      )

      // Anchor label
      const anchor = screen.getByRole('link', {
        name: /get tickets at the box office via venue/i,
      })
      expect(anchor).toBeDefined()
      expect(anchor.textContent).toContain('Get Tickets')
      expect(anchor.textContent).toContain('↗')

      // Filled signal background (no outline) — inline style assertions.
      // JSDOM expands `border: none` to `border-style: none` (width empty).
      const anchorEl = anchor as HTMLAnchorElement
      expect(anchorEl.style.background).toBe('var(--signal)')
      expect(anchorEl.style.borderStyle).toBe('none')
      expect(anchorEl.style.color).toBe('var(--fg-on-accent)')

      // Caption text
      expect(screen.getByText('Venue · face value, no fees')).toBeDefined()

      // Caption dot — gold (TIER_COLOR_BOXOFFICE)
      const captionText = screen.getByText('Venue · face value, no fees')
      const captionRow = captionText.parentElement as HTMLElement
      const dot = captionRow.querySelector('[aria-hidden]') as HTMLElement
      expect(dot).toBeDefined()
      // JSDOM strips trailing zeros from oklch values (0.20 → 0.2); compare
      // against the normalized form.
      expect(dot.style.background).toBe('oklch(0.66 0.14 78)')

      // External-link safety
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    })
  })

  describe('kind="primary"', () => {
    it('renders "Get Tickets ↗", signal background, subtle dot + caption with vendor name', () => {
      render(
        <ProvenanceCTA
          kind="primary"
          vendor="Ticketmaster"
          href="https://example.com/primary"
        />,
      )

      const anchor = screen.getByRole('link', {
        name: /get tickets via ticketmaster — official vendor/i,
      })
      expect(anchor).toBeDefined()
      expect(anchor.textContent).toContain('Get Tickets')
      expect(anchor.textContent).toContain('↗')

      const anchorEl = anchor as HTMLAnchorElement
      expect(anchorEl.style.background).toBe('var(--signal)')
      expect(anchorEl.style.borderStyle).toBe('none')

      // Caption text
      expect(
        screen.getByText('Official vendor · Ticketmaster · face + fees'),
      ).toBeDefined()

      // Caption dot — subtle (var(--fg-subtle))
      const captionText = screen.getByText(
        'Official vendor · Ticketmaster · face + fees',
      )
      const captionRow = captionText.parentElement as HTMLElement
      const dot = captionRow.querySelector('[aria-hidden]') as HTMLElement
      expect(dot).toBeDefined()
      expect(dot.style.background).toBe('var(--fg-subtle)')

      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    })
  })

  describe('kind="resale" + outline=true', () => {
    it('renders "See resale tickets ↗", transparent background with border, coral dot + caption', () => {
      render(
        <ProvenanceCTA
          kind="resale"
          vendor="Ticketmaster"
          href="https://example.com/resale"
          outline
        />,
      )

      const anchor = screen.getByRole('link', {
        name: 'Buy resale on Ticketmaster — usually above face value',
      })
      expect(anchor).toBeDefined()
      expect(anchor.textContent).toContain('See resale tickets')
      expect(anchor.textContent).toContain('↗')

      // Outline shape — JSDOM doesn't split the `border` shorthand when
      // it contains var(), so assert against the rendered style attribute.
      const anchorEl = anchor as HTMLAnchorElement
      expect(anchorEl.style.background).toBe('transparent')
      expect(anchorEl.getAttribute('style')).toContain(
        'border: 1px solid var(--border-strong)',
      )
      expect(anchorEl.style.color).toBe('var(--fg)')

      // Caption text
      expect(
        screen.getByText('Ticketmaster resale · usually above face value'),
      ).toBeDefined()

      // Caption dot — coral (TIER_COLOR_RESALE)
      const captionText = screen.getByText(
        'Ticketmaster resale · usually above face value',
      )
      const captionRow = captionText.parentElement as HTMLElement
      const dot = captionRow.querySelector('[aria-hidden]') as HTMLElement
      expect(dot).toBeDefined()
      // JSDOM strips trailing zeros from oklch values (0.20 → 0.2).
      expect(dot.style.background).toBe('oklch(0.65 0.2 25)')

      // External-link safety
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    })
  })
})
