// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LegalLinksCard } from './LegalLinksCard'

// The whole point of this card is reachability: signed in, these are the only
// links to our own legal documents outside the paid checkout panel.
describe.each(['mobile', 'desktop'] as const)(
  'LegalLinksCard (%s)',
  (variant) => {
    it('links to Terms', () => {
      render(<LegalLinksCard variant={variant} />)
      expect(
        screen.getByRole('link', { name: 'Terms' }).getAttribute('href'),
      ).toBe('/legal/terms')
    })

    it('links to Privacy', () => {
      render(<LegalLinksCard variant={variant} />)
      expect(
        screen.getByRole('link', { name: 'Privacy' }).getAttribute('href'),
      ).toBe('/legal/privacy')
    })

    it('renders exactly the two legal links', () => {
      render(<LegalLinksCard variant={variant} />)
      expect(screen.getAllByRole('link')).toHaveLength(2)
    })
  },
)
