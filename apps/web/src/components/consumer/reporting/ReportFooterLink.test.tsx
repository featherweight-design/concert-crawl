// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ReportFooterLink } from './ReportFooterLink'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.reportFooterLink

describe('ReportFooterLink', () => {
  afterEach(cleanup)

  it('leaves the accessible name alone when signed in', () => {
    render(<ReportFooterLink liveStatus={null} onOpen={vi.fn()} />)

    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(null)
  })

  it('announces the sign-up gate on the no-status row', () => {
    render(<ReportFooterLink liveStatus={null} onOpen={vi.fn()} signedOut />)

    expect(
      screen.getByRole('button', { name: copy.ariaSignedOut }),
    ).toBeTruthy()
    // Announced, not drawn: the visible copy is unchanged.
    expect(screen.getByText(copy.title)).toBeTruthy()
  })

  it('announces the sign-up gate on the has-status row', () => {
    render(
      <ReportFooterLink liveStatus="sold-out" onOpen={vi.fn()} signedOut />,
    )

    expect(
      screen.getByRole('button', { name: copy.ariaSignedOutHasStatus }),
    ).toBeTruthy()
    expect(screen.getByText(copy.titleHasStatus)).toBeTruthy()
  })
})
