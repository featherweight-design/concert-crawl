// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { DeclineCategory } from '@concert-crawl/types'
import {
  FailureActions,
  FailureCardKeptNote,
  FailureSurfaceIntro,
  failureDialogProps,
  failureHeadlineId,
  failureBodyId,
} from './FailureSurface'
import { TIER_PICKER_COPY } from './definitions/copy'
import { FAILURE_SURFACE_BEHAVIOR } from './definitions/constants'

const FAILURE_COPY = TIER_PICKER_COPY.failure

const CATEGORIES: DeclineCategory[] = [
  'insufficient_funds',
  'expired_or_incorrect_card',
  'issuer_declined',
  'fraud_block',
  'network_timeout',
]

// Mirrors how CheckoutForm composes the pieces around the payment element.
const Harness = ({
  category,
  onPrimary = vi.fn(),
  onSecondary = vi.fn(),
  onDismiss = vi.fn(),
}: {
  category: DeclineCategory
  onPrimary?: () => void
  onSecondary?: () => void
  onDismiss?: () => void
}) => (
  <div>
    <FailureSurfaceIntro category={category} onDismiss={onDismiss} />
    {!FAILURE_SURFACE_BEHAVIOR[category].freshCard && <FailureCardKeptNote />}
    <FailureActions
      category={category}
      disabled={false}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
    />
  </div>
)

describe.each(CATEGORIES)('FailureSurface — %s', (category) => {
  const config = FAILURE_COPY.categories[category]
  const behavior = FAILURE_SURFACE_BEHAVIOR[category]

  it('renders the verbatim eyebrow, headline, and body', () => {
    render(<Harness category={category} />)
    expect(screen.getByText(config.eyebrow)).toBeTruthy()
    expect(screen.getByText(config.headline)).toBeTruthy()
    expect(screen.getByText(config.body)).toBeTruthy()
  })

  it('exposes alertdialog overrides for the ModalShell root (no nested dialog)', () => {
    expect(failureDialogProps(category)).toEqual({
      role: 'alertdialog',
      ariaLabelledBy: failureHeadlineId(category),
      ariaDescribedBy: failureBodyId(category),
    })
    render(<Harness category={category} />)
    // The surface itself must not create a second modal root.
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByText(config.headline).id).toBe(
      failureHeadlineId(category),
    )
    expect(screen.getByText(config.body).id).toBe(failureBodyId(category))
  })

  it('announces the headline assertively', () => {
    render(<Harness category={category} />)
    expect(screen.getByText(config.headline).getAttribute('aria-live')).toBe(
      'assertive',
    )
  })

  it('moves focus to the primary CTA on mount', () => {
    render(<Harness category={category} />)
    const primary = screen.getByRole('button', { name: config.primary })
    expect(document.activeElement).toBe(primary)
  })

  it('renders the primary CTA and it fires onPrimary', () => {
    const onPrimary = vi.fn()
    render(<Harness category={category} onPrimary={onPrimary} />)
    fireEvent.click(screen.getByRole('button', { name: config.primary }))
    expect(onPrimary).toHaveBeenCalled()
  })

  it(`${behavior.hasSecondary ? 'renders' : 'omits'} the "Use a different card" secondary`, () => {
    render(<Harness category={category} />)
    const secondary = screen.queryByRole('button', {
      name: FAILURE_COPY.secondary,
    })
    if (behavior.hasSecondary) expect(secondary).toBeTruthy()
    else expect(secondary).toBeNull()
  })

  it('renders the close button and it dismisses', () => {
    const onDismiss = vi.fn()
    render(<Harness category={category} onDismiss={onDismiss} />)
    fireEvent.click(
      screen.getByRole('button', { name: FAILURE_COPY.closeLabel }),
    )
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('never renders the word "fraud"', () => {
    const { container } = render(<Harness category={category} />)
    expect(container.textContent).not.toMatch(/fraud/i)
  })
})

describe('FailureSurface — notes', () => {
  it('renders the fraud_block note WITHOUT aria-live', () => {
    render(<Harness category="fraud_block" />)
    const note = screen.getByText(FAILURE_COPY.categories.fraud_block.note)
    expect(note).toBeTruthy()
    // aria-live sits on the note row (parent), which must not have it.
    expect(note.parentElement?.getAttribute('aria-live')).toBeNull()
  })

  it('renders the network_timeout note as a polite live region', () => {
    render(<Harness category="network_timeout" />)
    const note = screen.getByText(FAILURE_COPY.categories.network_timeout.note)
    expect(note.parentElement?.getAttribute('aria-live')).toBe('polite')
  })

  it('renders no note for the other three categories', () => {
    for (const category of [
      'insufficient_funds',
      'expired_or_incorrect_card',
      'issuer_declined',
    ] as const) {
      const { unmount } = render(<Harness category={category} />)
      expect(
        screen.queryByText(FAILURE_COPY.categories.fraud_block.note),
      ).toBeNull()
      unmount()
    }
  })

  it('shows the card-kept note only for network_timeout', () => {
    const { unmount } = render(<Harness category="network_timeout" />)
    expect(screen.getByText(FAILURE_COPY.cardKeptNote)).toBeTruthy()
    unmount()
    render(<Harness category="insufficient_funds" />)
    expect(screen.queryByText(FAILURE_COPY.cardKeptNote)).toBeNull()
  })
})

describe('FailureSurface — copy contract codes', () => {
  it('assigns the design-table rail codes 01–05', () => {
    expect(FAILURE_COPY.categories.insufficient_funds.code).toBe('01')
    expect(FAILURE_COPY.categories.expired_or_incorrect_card.code).toBe('02')
    expect(FAILURE_COPY.categories.issuer_declined.code).toBe('03')
    expect(FAILURE_COPY.categories.fraud_block.code).toBe('04')
    expect(FAILURE_COPY.categories.network_timeout.code).toBe('05')
  })
})
