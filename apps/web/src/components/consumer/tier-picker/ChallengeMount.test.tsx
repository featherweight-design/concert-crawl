// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  ChallengeMount,
  challengeHeadlineId,
  challengeBodyId,
  challengeDialogProps,
} from './ChallengeMount'
import { TIER_PICKER_COPY } from './definitions/copy'
import type { ChallengeKind } from './definitions/types'

const CHALLENGE_COPY = TIER_PICKER_COPY.challenge

const KINDS: ChallengeKind[] = ['3ds', 'sca']

describe.each(KINDS)('ChallengeMount — %s', (kind) => {
  const config = CHALLENGE_COPY.kinds[kind]

  const renderMount = (onCancel = vi.fn()) => {
    render(<ChallengeMount kind={kind} tierKey="premium" onCancel={onCancel} />)
    return onCancel
  }

  it('exposes plain-dialog overrides (NOT alertdialog) for the ModalShell root', () => {
    expect(challengeDialogProps(kind)).toEqual({
      role: 'dialog',
      ariaLabelledBy: challengeHeadlineId(kind),
      ariaDescribedBy: challengeBodyId(kind),
    })
    renderMount()
    // The chrome itself must not create a nested modal root.
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByText(config.headline).id).toBe(challengeHeadlineId(kind))
    expect(screen.getByText(config.body).id).toBe(challengeBodyId(kind))
  })

  it('renders the verbatim headline and body', () => {
    renderMount()
    expect(screen.getByText(config.headline)).toBeTruthy()
    expect(screen.getByText(config.body)).toBeTruthy()
  })

  it('renders the Stripe challenge frame with its fixed strings', () => {
    renderMount()
    const frame = screen.getByRole('group', {
      name: CHALLENGE_COPY.frameLabel,
    })
    expect(frame).toBeTruthy()
    expect(screen.getByText(CHALLENGE_COPY.frameTopLeft)).toBeTruthy()
    expect(screen.getByText(CHALLENGE_COPY.frameTopRight)).toBeTruthy()
    expect(screen.getByText(CHALLENGE_COPY.waiting)).toBeTruthy()
    expect(screen.getByText(CHALLENGE_COPY.frameBottom)).toBeTruthy()
  })

  it('renders the footer note and Cancel payment fires onCancel', () => {
    const onCancel = renderMount()
    expect(screen.getByText(CHALLENGE_COPY.footerNote)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: CHALLENGE_COPY.cancel }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders the close X with the cancel-verification label, firing onCancel', () => {
    const onCancel = renderMount()
    fireEvent.click(
      screen.getByRole('button', { name: CHALLENGE_COPY.closeLabel }),
    )
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('ChallengeMount — copy contract', () => {
  it('carries the design-table rail eyebrows and codes', () => {
    expect(CHALLENGE_COPY.kinds['3ds'].eyebrow).toBe('SECURE CHECK · 3DS')
    expect(CHALLENGE_COPY.kinds['3ds'].code).toBe('3DS')
    expect(CHALLENGE_COPY.kinds.sca.eyebrow).toBe('SECURE CHECK · SCA')
    expect(CHALLENGE_COPY.kinds.sca.code).toBe('SCA')
  })
})
