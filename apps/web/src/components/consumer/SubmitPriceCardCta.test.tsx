// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SubmitPriceCardButton } from './SubmitPriceCardCta'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.submitPriceCardCta

describe('SubmitPriceCardButton signed-out gate is announced, not drawn (#1247)', () => {
  it('carries the sign-up invitation on the accessible name only', () => {
    render(<SubmitPriceCardButton signedOut onClick={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: copy.ariaSignedOut }),
    ).toBeInTheDocument()
    // The card itself is unchanged: no dimming, no lock, no relabel.
    expect(screen.getByText(copy.heading)).toBeInTheDocument()
    expect(screen.getByText(copy.ctaLabel)).toBeInTheDocument()
  })

  it('leaves the accessible name alone when signed in', () => {
    render(<SubmitPriceCardButton onClick={vi.fn()} />)

    expect(
      screen.queryByRole('button', { name: copy.ariaSignedOut }),
    ).toBeNull()
  })
})
